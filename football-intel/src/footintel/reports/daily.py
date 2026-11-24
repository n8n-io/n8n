"""Pre-match and post-match reports, built only from rows stored in the database."""

import html
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd
from jinja2 import Environment
from sqlalchemy import Engine, text

from footintel.config import Settings

_env = Environment(autoescape=False, trim_blocks=True, lstrip_blocks=True)


def _pct(x) -> str:
    return "n/d" if x is None or pd.isna(x) else f"{100 * x:.0f} %"


_env.filters["pct"] = _pct
_env.filters["num"] = lambda x, d=3: "n/d" if x is None or pd.isna(x) else f"{x:.{d}f}"

PREMATCH_MD = _env.from_string("""\
# Rapport pré-match — {{ day }}

Généré le {{ generated }} ({{ tz }}). Modèle actif : {{ model or "aucun" }}.
Probabilités issues d'un modèle statistique : elles quantifient l'incertitude, elles ne garantissent rien.

{% if rows.empty %}
Aucune prédiction enregistrée pour les {{ horizon }} prochains jours.
{% else %}
| Coup d'envoi | Compétition | Match | 1 | X | 2 | Marché 1/X/2 | +2,5 buts | BTTS | Qualité | Mon pronostic |
|---|---|---|---|---|---|---|---|---|---|---|
{% for r in rows.itertuples() %}
| {{ r.kickoff_local }} | {{ r.competition }} | {{ r.home_team }} – {{ r.away_team }} | {{ r.p_home|pct }} | {{ r.p_draw|pct }} | {{ r.p_away|pct }} | {{ r.mkt_txt }} | {{ r.p_over_2_5|pct }} | {{ r.p_btts|pct }} | {{ r.quality_txt }} | ____ |
{% endfor %}

{% if disagreements %}
## Désaccords modèle / marché (écart > 10 points)
{% for d in disagreements %}
- {{ d }}
{% endfor %}
{% endif %}
{% endif %}
""")

POSTMATCH_MD = _env.from_string("""\
# Rapport post-match — du {{ start }} au {{ end }}

Généré le {{ generated }} ({{ tz }}). Uniquement les prédictions enregistrées avant le coup d'envoi.

## Résultats évalués
{% if rows.empty %}
Aucun match évaluable sur la période.
{% else %}
| Match | Score | Modèle | P(résultat réel) | Log loss | Brier | Correct | Mon pronostic |
|---|---|---|---|---|---|---|---|
{% for r in rows.itertuples() %}
| {{ r.home_team }} – {{ r.away_team }} | {{ r.home_goals }}-{{ r.away_goals }} | {{ r.model_name }} | {{ r.probability_of_outcome|pct }} | {{ r.log_loss|num }} | {{ r.brier|num }} | {{ "oui" if r.correct else "non" }} | {{ r.user_txt }} |
{% endfor %}

## Métriques 1X2 sur la période
| Prédicteur | n | Log loss moyen | Brier moyen | Taux de réussite |
|---|---|---|---|---|
{% for a in aggregates.itertuples() %}
| {{ a.predictor }} | {{ a.n }} | {{ a.log_loss|num }} | {{ a.brier|num }} | {{ a.accuracy|pct }} |
{% endfor %}
{% if small_sample %}

> Échantillon de {{ n_matches }} match(s) : trop petit pour conclure quoi que ce soit.
> Les comparaisons fiables viennent du backtest et du cumul sur plusieurs semaines.
{% endif %}

## Erreurs notables (plus forte log loss)
{% for e in errors.itertuples() %}
- {{ e.home_team }} – {{ e.away_team }} ({{ e.home_goals }}-{{ e.away_goals }}) : le modèle donnait {{ e.probability_of_outcome|pct }} au résultat réel.
{% endfor %}
{% endif %}

## Anomalies de données sur la période
{% if issues.empty %}
Aucune.
{% else %}
{% for i in issues.itertuples() %}
- [{{ i.severity }}] {{ i.code }} : {{ i.n }} occurrence(s)
{% endfor %}
{% endif %}
""")

HTML_WRAPPER = """<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title>
<style>body{{font-family:system-ui,sans-serif;max-width:1100px;margin:auto;padding:16px;
color:#1b1f24;background:#fff}}table{{border-collapse:collapse;width:100%;font-size:14px;
display:block;overflow-x:auto}}td,th{{border:1px solid #d0d7de;padding:4px 8px;text-align:left}}
th{{background:#f6f8fa}}blockquote{{color:#57606a;border-left:4px solid #d0d7de;margin:0;
padding-left:12px}}@media (prefers-color-scheme:dark){{body{{background:#0d1117;color:#e6edf3}}
th{{background:#161b22}}td,th{{border-color:#30363d}}}}</style></head><body>{body}</body></html>"""


_BOLD = re.compile(r"\*\*(.+?)\*\*")


def _md_to_html(md: str) -> str:
    """Small converter for the subset of Markdown the templates produce."""
    out, in_table, in_list = [], False, False
    for line in html.escape(md, quote=False).splitlines():
        if line.startswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            if all(set(c) <= {"-"} for c in cells):
                continue
            if not in_table:
                out.append("<table>")
                in_table = True
                out.append("<tr>" + "".join(f"<th>{c}</th>" for c in cells) + "</tr>")
            else:
                out.append("<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>")
            continue
        if in_table:
            out.append("</table>")
            in_table = False
        if line.startswith("- "):
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{line[2:]}</li>")
            continue
        if in_list:
            out.append("</ul>")
            in_list = False
        if line.strip() == "---":
            out.append("<hr>")
        elif line.startswith("### "):
            out.append(f"<h3>{line[4:]}</h3>")
        elif line.startswith("## "):
            out.append(f"<h2>{line[3:]}</h2>")
        elif line.startswith("# "):
            out.append(f"<h1>{line[2:]}</h1>")
        elif line.startswith("&gt; "):
            out.append(f"<blockquote>{line[5:]}</blockquote>")
        elif line.strip():
            out.append(f"<p>{line}</p>")
    if in_table:
        out.append("</table>")
    if in_list:
        out.append("</ul>")
    return _BOLD.sub(r"<strong>\1</strong>", "\n".join(out))


@dataclass
class Report:
    markdown: str
    html: str
    csv: pd.DataFrame
    paths: dict[str, Path]


# Credits required by the OpenLigaDB licence (ODbL 1.0) and the football-data.org terms.
SOURCES_NOTE = ("Sources : football-data.co.uk ; openfootball (domaine public) ; "
                "Daten von OpenLigaDB (www.openligadb.de), lizenziert unter ODbL 1.0 ; "
                "Data provided by football-data.org.")


def _write(settings: Settings, stem: str, md: str, title: str, csv: pd.DataFrame) -> Report:
    md = md.rstrip("\n") + f"\n\n---\n{SOURCES_NOTE}\n"
    folder = Path(settings.reports_dir)
    folder.mkdir(parents=True, exist_ok=True)
    page = HTML_WRAPPER.format(title=html.escape(title), body=_md_to_html(md))
    paths = {"md": folder / f"{stem}.md", "html": folder / f"{stem}.html",
             "csv": folder / f"{stem}.csv"}
    paths["md"].write_text(md, encoding="utf-8")
    paths["html"].write_text(page, encoding="utf-8")
    csv.to_csv(paths["csv"], index=False)
    return Report(md, page, csv, paths)


_PREMATCH_SQL = text("""
SELECT DISTINCT ON (p.match_id) p.match_id, m.kickoff_utc, m.kickoff_date, c.code AS competition,
       th.name AS home_team, ta.name AS away_team, p.p_home, p.p_draw, p.p_away, p.p_over_2_5,
       p.p_btts, p.feature_snapshot, p.data_quality, p.sufficient_data, p.predicted_at,
       mv.name || ' v' || mv.version AS model
FROM predictions p
JOIN model_versions mv ON mv.id = p.model_version_id
JOIN matches m ON m.id = p.match_id
JOIN competitions c ON c.id = m.competition_id
JOIN teams th ON th.id = m.home_team_id
JOIN teams ta ON ta.id = m.away_team_id
WHERE m.status = 'scheduled' AND m.kickoff_date BETWEEN :start AND :end
  AND mv.status = 'active'
ORDER BY p.match_id, p.predicted_at DESC
""")


def prematch_report(engine: Engine, settings: Settings, horizon_days: int = 7,
                    today: date | None = None) -> Report:
    tz = ZoneInfo(settings.timezone)
    today = today or datetime.now(tz).date()
    with engine.connect() as conn:
        rows = pd.read_sql(_PREMATCH_SQL, conn,
                           params={"start": today, "end": today + timedelta(days=horizon_days)})
    disagreements = []
    if not rows.empty:
        rows = rows.sort_values(["kickoff_date", "kickoff_utc"]).reset_index(drop=True)
        rows["kickoff_local"] = [
            pd.Timestamp(k).tz_convert(tz).strftime("%d/%m %H:%M") if not pd.isna(k)
            else f"{pd.Timestamp(d):%d/%m} (heure inconnue)"
            for k, d in zip(rows["kickoff_utc"], rows["kickoff_date"], strict=True)]
        mkt_txt, quality_txt = [], []
        for r in rows.itertuples():
            snap = r.feature_snapshot or {}
            mk = [snap.get("mkt_p_home"), snap.get("mkt_p_draw"), snap.get("mkt_p_away")]
            if all(v is not None for v in mk):
                mkt_txt.append(" / ".join(_pct(v) for v in mk))
                for label, mine, theirs in zip(("1", "X", "2"), (r.p_home, r.p_draw, r.p_away),
                                               mk, strict=True):
                    if abs(mine - theirs) > 0.10:
                        disagreements.append(f"{r.home_team} – {r.away_team} : {label} modèle "
                                             f"{_pct(mine)} contre marché {_pct(theirs)}")
            else:
                mkt_txt.append("pas de cote")
            warns = (r.data_quality or {}).get("warnings", [])
            quality_txt.append("OK" if r.sufficient_data and not warns
                               else "⚠ " + "; ".join(w.split(":")[0] for w in warns))
        rows["mkt_txt"], rows["quality_txt"] = mkt_txt, quality_txt
    model = rows["model"].iloc[0] if not rows.empty else None
    md = PREMATCH_MD.render(day=today.strftime("%d/%m/%Y"), tz=settings.timezone,
                            generated=datetime.now(tz).strftime("%d/%m/%Y %H:%M"), rows=rows,
                            model=model, horizon=horizon_days, disagreements=disagreements)
    csv = rows.drop(columns=["feature_snapshot", "data_quality"], errors="ignore")
    return _write(settings, f"prematch_{today:%Y%m%d}", md, "Rapport pré-match", csv)


_POSTMATCH_SQL = text("""
SELECT e.match_id, e.predictor_kind, e.model_name, e.market, e.probability_of_outcome,
       e.log_loss, e.brier, e.correct, m.kickoff_date, th.name AS home_team, ta.name AS away_team,
       o.home_goals, o.away_goals
FROM prediction_evaluations e
JOIN matches m ON m.id = e.match_id
JOIN match_outcomes o ON o.match_id = m.id
JOIN teams th ON th.id = m.home_team_id
JOIN teams ta ON ta.id = m.away_team_id
WHERE m.kickoff_date BETWEEN :start AND :end
""")

_ISSUES_SQL = text("""
SELECT severity, code, count(*) AS n FROM data_quality_issues
WHERE created_at >= :since GROUP BY severity, code ORDER BY n DESC
""")


def postmatch_report(engine: Engine, settings: Settings, start: date, end: date) -> Report:
    tz = ZoneInfo(settings.timezone)
    with engine.connect() as conn:
        ev = pd.read_sql(_POSTMATCH_SQL, conn, params={"start": start, "end": end})
        issues = pd.read_sql(_ISSUES_SQL, conn,
                             params={"since": datetime.combine(start, datetime.min.time(), UTC)})
    one = ev[ev["market"] == "1X2"]
    model_rows = one[one["predictor_kind"] == "model"].copy()
    users = one[one["predictor_kind"] == "user"][["match_id", "correct"]]
    user_txt = {m: ("juste" if c else "faux") for m, c in zip(users["match_id"], users["correct"],
                                                              strict=True)}
    model_rows["user_txt"] = [user_txt.get(m, "—") for m in model_rows["match_id"]]

    agg = []
    for (kind, name), f in one.groupby(["predictor_kind", "model_name"]):
        agg.append({"predictor": f"{kind}:{name}", "n": len(f),
                    "log_loss": f["log_loss"].mean(), "brier": f["brier"].mean(),
                    "accuracy": f["correct"].astype(float).mean()})
    aggregates = pd.DataFrame(agg, columns=["predictor", "n", "log_loss", "brier", "accuracy"])
    n_matches = int(one["match_id"].nunique())
    errors = model_rows.sort_values("log_loss", ascending=False).head(5)
    md = POSTMATCH_MD.render(start=start.strftime("%d/%m/%Y"), end=end.strftime("%d/%m/%Y"),
                             tz=settings.timezone,
                             generated=datetime.now(tz).strftime("%d/%m/%Y %H:%M"),
                             rows=model_rows, aggregates=aggregates, errors=errors,
                             issues=issues, n_matches=n_matches, small_sample=n_matches < 100)
    return _write(settings, f"postmatch_{start:%Y%m%d}_{end:%Y%m%d}", md, "Rapport post-match", ev)
