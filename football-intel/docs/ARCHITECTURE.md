# Architecture

Couches strictement séparées. Chaque couche ne dépend que de celles du dessous.

```mermaid
flowchart TD
    subgraph Sources
        FD[football-data.co.uk CSV]
        AF[API-Football - désactivé sans clé]
    end
    subgraph Ingestion
        C[connectors/*: MatchRecord commun]
        S[ingestion/store.py: upsert idempotent]
        T[ingestion/tasks.py: tâches + journal + verrou]
    end
    DB[(PostgreSQL)]
    subgraph Analyse
        D[features/dataset.py: lecture]
        F[features/builder.py: features sans fuite]
        M[models/*: modèles interchangeables]
        B[evaluation/backtest.py]
        R[models/registry.py: versions, promotion, rollback]
    end
    subgraph Sorties
        P[predictions/service.py]
        E[postmatch/evaluate.py]
        RP[reports/daily.py]
        API[api/app.py]
        CLI[cli.py]
        SCH[scheduler.py]
    end
    FD --> C
    AF -.-> C
    C --> S --> DB
    T --> S
    DB --> D --> F --> M
    M --> B --> DB
    M --> R --> DB
    R --> P --> DB
    DB --> E --> DB
    DB --> RP
    DB --> API
    SCH --> T & P & E & RP & R
    CLI --> T & B & R & P & E & RP
```

## Points clés

- **Format commun** : tout connecteur renvoie des `MatchRecord` (`connectors/base.py`).
  Ajouter une source = écrire un connecteur, sans toucher au reste.
- **Idempotence** : un match est identifié par `(source, external_id)` dans
  `match_external_refs`. Les cotes sont uniques par
  `(match, source, bookmaker, marché, sélection, label du relevé)`.
- **Provenance** : `source_id` et `collected_at` sur chaque donnée externe ;
  `captured_at` / `known_at` quand l'heure de connaissance est disponible.
- **Transactions** : une transaction par fichier importé ; un fichier défectueux
  ne laisse aucune ligne partielle.
- **Verrous** : `scheduled_jobs.lock_owner` + expiration, pris par un seul `UPDATE`
  conditionnel. Une tâche planifiée et une tâche manuelle ne se chevauchent pas.
- **Temps** : stockage en UTC ; affichage et planification en `TIMEZONE`
  (Africa/Lubumbashi par défaut).
- **Modèles** : interface `fit / predict` (`models/base.py`), configuration nommée
  dans `models/zoo.py`. Un nom construit toujours la même configuration.
- **Promotion** : critères dans `PromotionCriteria` (config), fixés avant
  l'évaluation. Échec ⇒ le modèle actif reste en place.

## Schéma de données

28 tables (migration `0001`). Tables demandées : `competitions, seasons, teams, players,
matches, match_events, team_match_statistics, player_match_statistics, injuries,
suspensions, lineups, odds_snapshots, news_items, data_sources, collection_runs,
predictions, user_predictions, match_outcomes, model_versions, training_runs,
model_metrics, prediction_evaluations, detected_patterns, scheduled_jobs`.

Tables ajoutées pour la traçabilité : `team_aliases` (noms par source),
`match_external_refs` (identité par source), `competition_source_codes`
(code de la compétition chez chaque source), `data_quality_issues`.

Tables créées mais **encore vides** faute de source : `players`, `player_match_statistics`,
`match_events`, `lineups`, `injuries`, `suspensions`, `news_items`, `detected_patterns`.
Elles seront remplies par API-Football (clé requise) et le moteur de patterns (phase 7).
