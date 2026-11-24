"""Pre-match sheet: observed indicators only, with an explicit list of what is missing.

Rules:
- Every number comes from rows stored before `as_of`.
- No style label ("high press", "low block") is written unless a source measures it.
  Formations, possession, pressing, key players and absences need a source that
  provides lineups and event data; until one is connected they are listed as missing.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime

import pandas as pd
from sqlalchemy import Engine, text

from footintel.reports.daily import _pct

_RECENT_SQL = text("""
SELECT m.id, m.kickoff_date, c.code AS competition, c.type AS ctype,
       (m.home_team_id = :team) AS at_home, m.neutral_venue,
       CASE WHEN m.home_team_id = :team THEN o.home_goals ELSE o.away_goals END AS gf,
       CASE WHEN m.home_team_id = :team THEN o.away_goals ELSE o.home_goals END AS ga,
       s_for.shots AS shots_for, s_against.shots AS shots_against,
       s_for.shots_on_target AS sot_for, s_against.shots_on_target AS sot_against,
       s_for.corners AS corners_for, s_against.corners AS corners_against,
       s_for.fouls AS fouls, s_for.yellow_cards AS yellows, s_for.red_cards AS reds,
       t.formation, t.possession_pct
FROM matches m
JOIN competitions c ON c.id = m.competition_id
JOIN match_outcomes o ON o.match_id = m.id
LEFT JOIN team_match_statistics s_for ON s_for.match_id = m.id AND s_for.team_id = :team
LEFT JOIN team_match_statistics s_against ON s_against.match_id = m.id AND s_against.team_id <> :team
LEFT JOIN team_match_tactics t ON t.match_id = m.id AND t.team_id = :team AND t.kind = 'official'
WHERE :team IN (m.home_team_id, m.away_team_id) AND m.kickoff_date < :before
ORDER BY m.kickoff_date DESC
LIMIT :n
""")

_COUNTS_SQL = text("""
SELECT (SELECT count(*) FROM lineups l JOIN matches m ON m.id = l.match_id
        WHERE l.team_id = :team) AS lineups,
       (SELECT count(*) FROM injuries WHERE team_id = :team) AS injuries,
       (SELECT count(*) FROM suspensions WHERE team_id = :team) AS suspensions,
       (SELECT count(*) FROM team_match_tactics WHERE team_id = :team) AS tactics
""")


@dataclass
class TeamSheet:
    name: str
    n_matches: int
    observed: dict[str, str]
    missing: list[str] = field(default_factory=list)


def _avg(series: pd.Series) -> str:
    s = pd.to_numeric(series, errors="coerce").dropna()
    return f"{s.mean():.1f} (sur {len(s)} matchs)" if len(s) else "non disponible"


def team_sheet(engine: Engine, team_id: int, team_name: str, before, n: int = 10) -> TeamSheet:
    with engine.connect() as conn:
        recent = pd.read_sql(_RECENT_SQL, conn, params={"team": team_id, "before": before, "n": n})
        counts = conn.execute(_COUNTS_SQL, {"team": team_id}).mappings().one()
    sheet = TeamSheet(team_name, len(recent), {})
    if recent.empty:
        sheet.missing.append("aucun match antérieur en base")
        return sheet
    pts = [(3 if gf > ga else 1 if gf == ga else 0) for gf, ga in zip(recent.gf, recent.ga, strict=True)]
    wdl = "".join("V" if p == 3 else "N" if p == 1 else "D" for p in pts)
    o = sheet.observed
    o["Derniers résultats (récent → ancien)"] = wdl
    o["Points par match"] = f"{sum(pts) / len(pts):.2f}"
    o["Buts marqués / encaissés par match"] = f"{recent.gf.mean():.2f} / {recent.ga.mean():.2f}"
    home = recent[recent.at_home & ~recent.neutral_venue]
    away = recent[~recent.at_home & ~recent.neutral_venue]
    if len(home):
        o["À domicile (buts pour-contre)"] = f"{home.gf.mean():.2f} - {home.ga.mean():.2f} ({len(home)} m.)"
    if len(away):
        o["À l'extérieur (buts pour-contre)"] = f"{away.gf.mean():.2f} - {away.ga.mean():.2f} ({len(away)} m.)"
    o["Tirs pour / contre"] = f"{_avg(recent.shots_for)} / {_avg(recent.shots_against)}"
    o["Tirs cadrés pour / contre"] = f"{_avg(recent.sot_for)} / {_avg(recent.sot_against)}"
    o["Corners obtenus / concédés"] = f"{_avg(recent.corners_for)} / {_avg(recent.corners_against)}"
    o["Fautes commises"] = _avg(recent.fouls)
    o["Cartons jaunes"] = _avg(recent.yellows)
    o["Compétitions jouées"] = ", ".join(f"{c} ({k})" for c, k in recent.competition.value_counts().items())
    formations = recent.formation.dropna()
    if len(formations):
        o["Formations récentes (source)"] = ", ".join(formations.value_counts().index[:3])
    possession = pd.to_numeric(recent.possession_pct, errors="coerce").dropna()
    if len(possession):
        o["Possession moyenne"] = f"{possession.mean():.1f} %"

    if not len(formations):
        sheet.missing.append("formations (aucune source de compositions connectée)")
    if not len(possession):
        sheet.missing.append("possession, pressing, PPDA, construction, transitions")
    if counts["lineups"] == 0:
        sheet.missing.append("joueurs cadres et dépendance aux joueurs (aucune composition en base)")
    if counts["injuries"] == 0 and counts["suspensions"] == 0:
        sheet.missing.append("blessures et suspensions")
    sheet.missing.append("xG / xGA (aucune source autorisée testée ne les fournit)")
    if recent.shots_for.isna().all():
        sheet.missing.append("tirs (la source de ces matchs ne fournit pas de statistiques)")
    return sheet


def match_sheet_markdown(engine: Engine, match_id: int, as_of: datetime | None = None) -> str:
    as_of = as_of or datetime.now(UTC)
    with engine.connect() as conn:
        m = conn.execute(text("""
            SELECT m.id, m.kickoff_date, m.kickoff_utc, m.round, m.neutral_venue, c.name AS comp,
                   m.home_team_id, m.away_team_id, th.name AS home, ta.name AS away
            FROM matches m JOIN competitions c ON c.id = m.competition_id
            JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
            WHERE m.id = :id"""), {"id": match_id}).mappings().one()
        pred = conn.execute(text("""
            SELECT p.*, mv.name || ' v' || mv.version AS model FROM predictions p
            JOIN model_versions mv ON mv.id = p.model_version_id
            WHERE p.match_id = :id AND p.predicted_at <= :as_of
            ORDER BY p.predicted_at DESC LIMIT 1"""), {"id": match_id, "as_of": as_of}).mappings().first()
    before = m["kickoff_date"]
    sheets = [team_sheet(engine, m["home_team_id"], m["home"], before),
              team_sheet(engine, m["away_team_id"], m["away"], before)]
    lines = [f"## {m['home']} – {m['away']}",
             f"{m['comp']}{' — ' + m['round'] if m['round'] else ''} · {m['kickoff_date']:%d/%m/%Y}"
             + (" · terrain neutre" if m["neutral_venue"] else ""), ""]
    for sh in sheets:
        lines += [f"### {sh.name} — {sh.n_matches} derniers matchs observés", ""]
        lines += [f"- {k} : {v}" for k, v in sh.observed.items()]
        if sh.missing:
            lines.append(f"- **Non disponible** : {'; '.join(sh.missing)}")
        lines.append("")
    lines += ["### Estimation du modèle", ""]
    if pred is None:
        lines.append("- Aucune prédiction enregistrée avant cette heure.")
    else:
        q = pred["data_quality"] or {}
        lines += [
            f"- 1 / N / 2 : {_pct(pred['p_home'])} / {_pct(pred['p_draw'])} / {_pct(pred['p_away'])}"
            f" ({pred['model']}, calculé le {pred['predicted_at']:%d/%m %H:%M} UTC)",
            f"- Buts attendus : {pred['exp_home_goals']:.2f} – {pred['exp_away_goals']:.2f}"
            if pred["exp_home_goals"] is not None else "- Buts attendus : non disponible",
            f"- Plus de 2,5 buts : {_pct(pred['p_over_2_5'])} · Les deux marquent : {_pct(pred['p_btts'])}",
            f"- Données suffisantes : {'oui' if pred['sufficient_data'] else 'NON'}"
            + (f" — {'; '.join(q.get('warnings', []))}" if q.get("warnings") else ""),
        ]
    lines += ["", "> Indicateurs observés, pas des certitudes. Aucun effet tactique n'est appliqué "
              "aux probabilités tant qu'il n'a pas été mesuré sur des données hors échantillon.", ""]
    return "\n".join(lines)
