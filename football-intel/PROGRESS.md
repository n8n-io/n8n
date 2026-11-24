# Suivi d'avancement

Dernière mise à jour : 2026-10-25 (histoires de matchs, scénarios récurrents, route à venir). Fichier à mettre à jour à la fin de chaque phase,
pour reprendre le travail après une interruption.

## État par phase

| Phase | État | Détail |
|---|---|---|
| 0 Audit | ✅ | Python 3.13, PostgreSQL 16, 4 CPU, 15 Go RAM. football-data.co.uk joignable ; API-Football exige une clé (403). |
| 1 Architecture | ✅ | docs/ARCHITECTURE.md, docs/DECISIONS.md. |
| 2 Fondations | ✅ | pyproject, config par variables d'environnement, 28 tables, migration Alembic 0001. |
| 3 Données historiques | ✅ | 187 167 matchs réels : 30 649 (4 championnats cibles) + 153 128 (24 championnats et divisions de contexte) + 3 390 (C1 2011-26, C3 2020-25, C4 2021-25). Relances sans doublon vérifiées. |
| 4 Collecte automatique | 🟡 | football-data et openfootball : fixtures, résultats, contexte, qualité, retry/backoff, cache disque, verrous, correspondance des noms relue. OpenLigaDB : C1, C3, C4 2026-27 et DFB-Pokal (444 matchs, contrôle des résultats). football-data.org (clé gratuite) : contrôle et complément des résultats de la C1. **Manquent** : FA Cup, EFL Cup, Copa del Rey, Coppa Italia, cotes des coupes, compositions, formations, blessures. API-Football : l'offre gratuite existe encore (100 requêtes par jour) mais ses saisons sont limitées ; non retenue. |
| 5 Baseline ML | ✅ | Naïf, Elo-Poisson, marché, régression logistique. |
| 6 ML avancé | 🟡 | RF, XGBoost, modèle aiguillé (actif), walk-forward, comparaisons appariées, calibration stockée. Candidats testés et rejetés selon les règles : calibration par température des coupes, Dixon-Coles (docs/RESULTS.md). **Manquent** : Optuna (Elo de départ), ensemble. |
| 7 Boucle post-match | 🟡 | Histoires de matchs enregistrées (avant-match, déroulé, tirs), 12 scénarios testés à cote égale (4 confirmés), 5 prochains matchs de chaque équipe (`footintel stories`). |
| 7 (suite) | 🟡 | Évaluation, registre, promotion, rollback, cycle hebdomadaire. Moteur de tendances par compétition et moteur de tendances statistiques (scores, équipes, fenêtres courte/moyenne/longue, statuts, persistance hors échantillon, apport par catégorie et par marché). Dérive des entrées (même fenêtre un an plus tôt, PSI + écart des moyennes) et des performances (à partir de 100 évaluations réelles). **Manque** : analyse des erreurs en direct (aucune prédiction réelle encore évaluée). |
| 8 Contribution humaine | ✅ | Saisie CLI/API/tableau de bord horodatée et figée, évaluation en justesse, modèle hybride évalué par blocs chronologiques (`footintel hybrid`, seuil 200 pronostics, adoption selon D9). Aucune donnée réelle pour l'instant : 0 pronostic. |
| 9 Dashboard | 🟡 | 5 espaces (vue générale, compétitions, équipes, pré-match, performance) sur `/dashboard/`, vérifiés dans Chromium en 1366 et 390 px. Pages « Mes pronostics » et « Administration » ajoutées et vérifiées dans Chromium (1366 et 390 px, sans erreur ni débordement). **Manque** : filtre par période infra-saison. |
| 10 Automatisation et rapports | 🟡 | Planificateur, rapports pré/post-match MD/HTML/CSV, unité systemd. Rapport hebdomadaire, notifications Telegram (testées avec un transport simulé ; jeton absent, donc pas d'envoi réel). **Manque** : export PDF. |
| 11 Validation finale | 🟡 | 53 tests hors ligne et 12 tests contre les vraies sources passent. |

## Critères d'acceptation

| # | Critère | État | Preuve |
|---|---|---|---|
| 1 | Initialiser la base | ✅ | `footintel db upgrade` ; tests : downgrade puis upgrade complets |
| 2 | Importer un historique | ✅ | 30 649 matchs réels |
| 3 | Collecte sans doublons | ✅ | relance réelle : +0 / 380 inchangés ; `test_history_import_is_idempotent` |
| 4 | Features sans fuite | ✅ | `test_features_ignore_same_day_and_future_results` |
| 5 | Entraîner un modèle probabiliste | ✅ | `routed_competition` v1 actif (plus/moins 2,5 : −0.0116, IC < 0 ; 1X2 non dégradé) |
| 6 | Produire et sauvegarder une prédiction | ✅ (synthétique) | `test_end_to_end_prediction_loop`. En réel : aucun match publié dans `fixtures.csv` le 2026-10-21. |
| 7 | Enregistrer un pronostic humain | ✅ | test e2e ; refus réel après le coup d'envoi via l'API (409) |
| 8 | Associer résultat et prédiction antérieure | ✅ (synthétique) | test e2e |
| 9 | Calculer les métriques | ✅ | backtest réel + évaluation post-match |
| 10 | Backtest chronologique | ✅ | docs/RESULTS.md |
| 11 | Comparer deux versions | ✅ | promotion réelle : v1 promue, `elo_poisson` rejeté, v2 promue |
| 12 | Rapport post-match | ✅ | `reports/postmatch_*.md/.html/.csv` |
| 13 | Tests automatisés | ✅ | `pytest` |
| 14 | Redémarrer selon la documentation | 🟡 | README écrit ; à valider sur le VPS |
| 15 | Mode dégradé sans clé | ✅ | `footintel status` réel : « disabled (no API_FOOTBALL_KEY) » |

## Coupes d'Europe : état réel

| Besoin | État |
|---|---|
| Historique C1 / C3 / C4 | ✅ openfootball (domaine public) |
| Force des adversaires étrangers | ✅ 13 championnats de contexte + Elo commun |
| Prédire les matchs de C1 / C3 / C4 **de la saison en cours** | ✅ OpenLigaDB (sans cotes : prédictions marquées « données insuffisantes ») |
| Coupes nationales | ✅ DFB-Pokal (OpenLigaDB, 16 prédictions réelles le 2026-10-22) ; ❌ FA Cup, EFL Cup, Copa del Rey, Coppa Italia |
| Fiche pré-match (indicateurs observés + manques explicites) | ✅ `footintel report fiche --match-id N` |
| Style, formations, joueurs cadres, absences, xG | ❌ aucune source autorisée connectée ; table `team_match_tactics` prête |

## Prochaine étape concrète

1. Définir sur le VPS, en variables d'environnement : `API_FOOTBALL_KEY` (calendrier des coupes
   2026-27, coupes nationales, compositions, formations, absences, après vérification des vraies
   réponses), `TELEGRAM_BOT_TOKEN` et `TELEGRAM_CHAT_ID`.
2. Saisir les pronostics personnels avant chaque match : le modèle hybride se calcule à 200.
3. Optimisation des Elo de départ sur les matchs européens (D14, D22).
