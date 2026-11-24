"""Weekly report: performance, versions, calibration, drift, trends, retraining decision.

Built only from stored rows. Sections without data say so instead of showing zeros.
"""

from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

import pandas as pd
from sqlalchemy import Engine, text

from footintel.config import Settings
from footintel.reports.daily import Report, _write


def _df(conn, sql: str, **params) -> pd.DataFrame:
    return pd.read_sql(text(sql), conn, params=params)


def weekly_report(engine: Engine, settings: Settings, end: date | None = None) -> Report:
    tz = ZoneInfo(settings.timezone)
    end = end or datetime.now(tz).date()
    start = end - timedelta(days=7)
    with engine.connect() as conn:
        live_week = _df(conn, """
            SELECT e.predictor_kind, e.model_name, c.code AS competition, count(*) AS n,
                   avg(e.log_loss) AS log_loss, avg(e.brier) AS brier, avg(e.correct::int) AS accuracy
            FROM prediction_evaluations e JOIN matches m ON m.id = e.match_id
            JOIN competitions c ON c.id = m.competition_id
            WHERE e.market = '1X2' AND m.kickoff_date BETWEEN :s AND :e GROUP BY 1, 2, 3 ORDER BY 1, 2, 3""",
                        s=start, e=end)
        live_all = _df(conn, """SELECT predictor_kind, model_name, market, count(*) AS n, avg(log_loss) AS log_loss
                                FROM prediction_evaluations GROUP BY 1, 2, 3 ORDER BY 1, 2, 3""")
        versions = _df(conn, """SELECT name, version, status, created_at, promoted_at, decision_note
                                FROM model_versions WHERE created_at >= :s OR status = 'active'
                                ORDER BY id""", s=datetime.combine(start, datetime.min.time(), UTC))
        calib = _df(conn, """SELECT model_name, segment, value, n FROM model_metrics WHERE metric = 'ece'
                             AND training_run_id = (SELECT max(id) FROM training_runs WHERE kind = 'calibration')
                             AND segment LIKE 'calibration:%%' ORDER BY model_name, segment""")
        drift_run = conn.execute(text("SELECT max(id) FROM training_runs WHERE kind = 'drift'")).scalar()
        drift = _df(conn, """SELECT segment, metric, value, n FROM model_metrics WHERE training_run_id = :r""",
                    r=drift_run or -1)
        perf_cfg = conn.execute(text("SELECT config FROM training_runs WHERE id = :r"),
                                {"r": drift_run or -1}).scalar() or {}
        trend_run = conn.execute(text("SELECT max(training_run_id) FROM trends")).scalar()
        trends = _df(conn, """SELECT population, competition, metric, status, observed, reference, n
                              FROM trends WHERE training_run_id = :r AND "window" = 'medium'
                                AND status IN ('rising', 'falling', 'emerging', 'unconfirmed', 'disappeared')
                                AND population_type = 'competition'
                              ORDER BY status, competition""", r=trend_run or -1)
        retrain = _df(conn, """SELECT id, kind, status, started_at, config FROM training_runs
                               WHERE kind = 'fit' AND started_at >= :s ORDER BY id""",
                      s=datetime.combine(start, datetime.min.time(), UTC))
        quality = _df(conn, """SELECT severity, code, count(*) AS n FROM data_quality_issues
                               WHERE created_at >= :s GROUP BY 1, 2 ORDER BY 3 DESC""",
                      s=datetime.combine(start, datetime.min.time(), UTC))
    L = [f"# Rapport hebdomadaire — semaine du {start:%d/%m/%Y} au {end:%d/%m/%Y}", "",
         f"Généré le {datetime.now(tz):%d/%m/%Y %H:%M} ({settings.timezone}).", ""]
    L += ["## Performance en conditions réelles", ""]
    if live_week.empty:
        L.append("- Aucune prédiction enregistrée avant match n'a été évaluée cette semaine.")
    else:
        for r in live_week.itertuples():
            L.append(f"- {r.predictor_kind} {r.model_name} — {r.competition} : n={r.n}, log loss "
                     f"{r.log_loss if pd.notna(r.log_loss) else float('nan'):.3f}, réussite {100 * r.accuracy:.0f} %")
    if not live_all.empty:
        L += ["", "Cumul depuis la mise en service :"]
        L += [f"- {r.predictor_kind} {r.model_name} {r.market} : n={r.n}"
              + (f", log loss {r.log_loss:.3f}" if pd.notna(r.log_loss) else "") for r in live_all.itertuples()]
        if live_all["n"].max() < 100:
            L.append("> Moins de 100 matchs évalués : trop peu pour conclure sur la performance réelle.")
    from footintel.analysis.errors import errors_markdown, model_errors

    L += [""] + errors_markdown(model_errors(engine, end - timedelta(days=28), end))
    L += ["", "## Versions du modèle", ""]
    L += [f"- {r.name} v{r.version} ({r.status}) — créée le {r.created_at:%d/%m/%Y}"
          + (f", promue le {r.promoted_at:%d/%m/%Y}" if pd.notna(r.promoted_at) else "")
          + (f" — {r.decision_note}" if r.decision_note else "") for r in versions.itertuples()]
    L += ["", "## Décision de réentraînement", ""]
    L.append("- Aucun réentraînement cette semaine." if retrain.empty else
             f"- {len(retrain)} entraînement(s) ; décision dans la section des versions ci-dessus.")
    L += ["", "## Calibration (backtest, ECE)", ""]
    if calib.empty:
        L.append("- Pas de table de calibration.")
    for r in calib[calib["segment"].str.startswith("calibration:all:")].itertuples():
        L.append(f"- {r.model_name} {r.segment.split(':', 2)[2]} : {r.value:.3f} (n={r.n})")
    L += ["", "## Dérive des données d'entrée", ""]
    if drift.empty:
        L.append("- Pas encore mesurée.")
    else:
        flagged = drift[(drift["metric"] == "psi") & ~drift["segment"].str.endswith(":stable")]
        L.append("Fenêtre récente contre la même période l'an dernier (PSI et écart standardisé).")
        L += [f"- {r.segment.split(':')[1]} : {r.segment.split(':')[2]} (PSI {r.value:.2f})" for r in flagged.itertuples()] \
            or ["- Aucune dérive."]
    perf = (perf_cfg or {}).get("performance", {}).get("models", [])
    L += ["", "## Dérive de performance", ""]
    L += [f"- {m['model']} : {m['status']} (n={m['n_live']})" for m in perf] or \
        ["- Pas encore de prédictions réelles évaluées (minimum 100)."]
    L += ["", "## Tendances de compétition (dernier calcul)", ""]
    L += [f"- {r.competition} {r.metric} : {r.status} ({r.observed:.3f} contre {r.reference:.3f}, n={r.n})"
          for r in trends.head(20).itertuples()] or ["- Aucune tendance non stable."]
    L += ["", "## Anomalies de données de la semaine", ""]
    L += [f"- [{r.severity}] {r.code} : {r.n}" for r in quality.itertuples()] or ["- Aucune."]
    md = "\n".join(L) + "\n"
    return _write(settings, f"weekly_{end:%Y%m%d}", md, "Rapport hebdomadaire", live_week)
