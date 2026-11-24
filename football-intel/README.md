# footintel — Football Intelligence & Prediction System

Plateforme personnelle de collecte de données football, de prédiction probabiliste
et d'évaluation mesurable. Version 0.2 : parcours complet de bout en bout,
CLI, API HTTP et tableau de bord web.

> Aucun système ne prédit le football avec certitude. Les probabilités quantifient
> l'incertitude ; leur qualité se mesure (log loss, Brier, calibration) et se compare
> à des références (fréquences naïves, marché des bookmakers).

## Ce qui fonctionne aujourd'hui (vérifié le 2026-10-21)

- Import de 30 649 matchs réels (Premier League, Liga, Serie A, Bundesliga, 2005-06 à 2026-27)
  depuis football-data.co.uk : résultats, tirs, cartons, corners, cotes avant clôture et de clôture.
- Coupes d'Europe : 3 390 matchs (C1 2011-26, C3 2020-25, C4 2021-25) depuis openfootball,
  plus 13 championnats de contexte (62 440 matchs) pour estimer la force des clubs étrangers.
- Fiche pré-match : indicateurs observés seulement, liste explicite des données manquantes.
- Tendances par compétition : profils par saison et segment, écarts à une référence qui ignore
  la compétition, évolutions, correction des tests multiples, validation hors échantillon,
  et mesure de l'apport prédictif de chaque niveau d'analyse. Voir docs/RESULTS.md.
- Collecte idempotente (relancer ne crée aucun doublon), journal des collectes, verrous par tâche.
- Features calculées sans fuite temporelle (Elo, forme, tirs, repos, cotes du marché).
- Modèles : fréquences naïves, Elo-Poisson, régression logistique, Random Forest, XGBoost,
  marché (cotes sans marge), composite 1X2 + buts.
- Backtest chronologique par saison, comparaisons appariées avec intervalle de confiance bootstrap.
- Registre de modèles : versions, empreinte SHA-256, promotion selon critères fixés à l'avance,
  retour arrière.
- Prédictions sauvegardées avec le snapshot des variables, la version du modèle et l'heure.
- Pronostics personnels horodatés, refusés après le coup d'envoi.
- Évaluation post-match, rapports pré-match et post-match (Markdown, HTML, CSV).
- Planification (APScheduler, fuseau Africa/Lubumbashi), API HTTP, sauvegarde/restauration.
- Mode dégradé sans clé API.
- Tableau de bord : 5 espaces d'analyse, plus « Mes pronostics » (saisie avant le coup d'envoi, historique,
  modèle hybride) et « Administration » (clés présentes ou absentes, planification, lancement manuel
  des cycles, retour arrière, activation des compétitions, journaux, anomalies).
- Rapport hebdomadaire : performance réelle, versions, décision de réentraînement, calibration,
  dérive des entrées et des performances, tendances, anomalies.
- Notifications Telegram après les cycles du matin, du soir et de la semaine (si configurées).

Ce qui n'est **pas** encore fait est listé dans [PROGRESS.md](PROGRESS.md).

## Installation (Linux / VPS)

**En une commande** (Debian ou Ubuntu, en root ou avec sudo) :

```bash
curl -fsSL https://raw.githubusercontent.com/benkas418-alt/n8n/claude/branche-higgsfield-974raq/football-intel/deploy/install.sh | sudo bash
```

Le script installe PostgreSQL, Python 3.13 (uv), le code, la base, les services systemd et,
si un domaine est donné, Caddy (HTTPS et mot de passe). Il demande les clés en saisie masquée
et les écrit seulement dans `/opt/football-intel/.env`. Le premier chargement (historique,
modèle, premières prédictions, environ 1 h) tourne ensuite en arrière-plan :
`sudo journalctl -fu footintel-bootstrap`. Relancer la même commande met le code à jour sans
toucher à `.env` ni aux données. Testé le 2026-10-28 sur Ubuntu 24.04 (sans systemd).

Installation manuelle :

Prérequis : Python ≥ 3.12, PostgreSQL ≥ 14, [uv](https://docs.astral.sh/uv/) (ou pip).

```bash
cd football-intel
uv venv .venv && uv pip install --python .venv/bin/python -e ".[dev]"

# Base de données (adapter le mot de passe)
sudo -u postgres psql -c "CREATE ROLE footintel LOGIN PASSWORD 'CHANGE_ME';"
sudo -u postgres createdb -O footintel footintel
sudo -u postgres createdb -O footintel footintel_test   # pour les tests

cp .env.example .env        # puis remplir DATABASE_URL et ADMIN_TOKEN
.venv/bin/footintel db upgrade      # migrations Alembic
.venv/bin/footintel db seed         # sources et compétitions
```

## Premier démarrage

```bash
F=.venv/bin/footintel
$F ingest history --first 2005          # ~2 min, télécharge 88 fichiers une seule fois
$F ingest context --first 2005          # 13 championnats de contexte (~4 min)
$F ingest european                      # C1 depuis 2011, C3 depuis 2020, C4 depuis 2021 (openfootball)
$F ingest openligadb                    # saison en cours : C1, C3, C4, DFB-Pokal
$F ingest football-data-org             # contrôle des résultats de C1 (clé FOOTBALL_DATA_ORG_KEY)
$F ingest odds-api                      # cotes 1X2 des coupes (clé ODDS_API_KEY, 1 crédit par compétition)
$F ingest onefootball                   # compositions et événements des 4 championnats (D50)
$F ingest fixtures                       # matchs à venir + cotes
$F backtest --seasons 5                  # évaluation chronologique
$F models train routed_odds_elo          # crée une version candidate
$F models promote <id> --seasons 3       # promue seulement si les critères sont remplis
$F predict                               # prédit les matchs des 7 prochains jours
$F report prematch
```

## Usage quotidien

| Action | Commande |
|---|---|
| Matchs à venir | `footintel upcoming` |
| Mon pronostic | `footintel user-predict <match_id> H 4 --score 2-1 --over25 yes --btts yes --reason "..."` |
| Cycle du matin (fixtures, coupes, cotes, compositions OneFootball, prédictions, rapport) | `footintel run morning` |
| Cycle du soir (résultats, évaluation, rapport) | `footintel run evening` |
| Contrôle qualité | `footintel run nightly` |
| Réentraînement + validation | `footintel run weekly` |
| Fiche pré-match | `footintel report fiche --match-id <id>` |
| Tendances par compétition + apport de chaque niveau | `footintel analyze` (~10 min) |
| Tendances statistiques (scores, équipes) | `footintel trends run` puis `footintel trends report --competition ENG-PL` (ou `--team`, `--category`, `--date`) |
| Apport des tendances par marché | `footintel trends evaluate` (~15 min) |
| État du système | `footintel status` |
| Revenir au modèle précédent | `footintel models rollback` |
| Histoires des matchs, scénarios récurrents, 5 prochains matchs | `footintel stories --days 7` |
| Vérifier une cote (betPawa ou autre) contre le modèle | page « Cotes » du tableau de bord (`/dashboard/value.html`) |
| Apport de mes pronostics (modèle hybride) | `footintel hybrid` (calculé à partir de 200 pronostics évalués) |
| Sauvegarde | `footintel db backup` |
| API HTTP | `footintel serve` (http://127.0.0.1:8000/docs) |
| Planificateur | `footintel scheduler` |

Restauration : `pg_restore --clean --no-owner -d "$DATABASE_URL_SANS_+psycopg" data/backups/<fichier>.dump`.

## Tableau de bord

`footintel serve` puis ouvrir http://127.0.0.1:8000/ (redirige vers `/dashboard/`).

| Espace | Question à laquelle il répond |
|---|---|
| Matchs (accueil) | Que dit le modèle sur les prochains matchs ? Probabilités 1 / X / 2 par jour, filtre par compétition, écart avec le marché. Un clic ouvre la fiche du match. |
| Fiche d'un match | L'essentiel en tête : qui gagne, qui marque en premier, score le plus probable, plus de 2,5 buts, les deux marquent. Onglets : Avant-match (forme, séries, buteurs, confrontations), Tactique (style mesuré de chaque équipe et lecture du match), Joueurs (charnières, impact de chaque titulaire avec et sans lui par ligne, défense match par match), Compositions (dernière composition sur un terrain), Classement, Journées, Analyse (scores probables, facteurs, fiabilité, mon pronostic). |
| Cotes | Vérificateur de cotes : cote juste, valeur théorique, combiné. |
| Mes pronostics | Mes choix horodatés contre le modèle et le résultat. |
| Compétitions | Évolution par saison avec intervalle de confiance, saison récente contre référence, matrice des scores (cliquable → matchs), distribution des buts, mi-temps, indicateurs de jeu, tendances et particularités. |
| Équipes | Production offensive et défensive sur 6 matchs contre la référence de l'équipe, tirs, tendances significatives, derniers matchs. |
| Fiabilité | Log loss, Brier, comparaisons appariées, log loss par compétition, courbes de calibration, apport mesuré des niveaux et tendances, historique des versions, résultats réels. |
| Tendances | Qu'est-ce qui change, qu'est-ce qui est confirmé, que manque-t-il ? |

Thème clair ou sombre : suit le téléphone ou l'ordinateur, ou le bouton « Thème ».

Les données non collectées (minutes des buts, xG, tactique, compositions) apparaissent comme
telles, jamais comme zéro. Le serveur écoute sur 127.0.0.1 par défaut : pour un accès distant,
voir « Accès depuis le téléphone ».

## Notifications Telegram

1. Créer un bot avec @BotFather et récupérer son jeton.
2. Envoyer un message au bot, puis lire l'identifiant de la discussion dans
   `https://api.telegram.org/bot<JETON>/getUpdates` (champ `chat.id`).
3. Dans `.env` du VPS (jamais dans le dépôt) : `TELEGRAM_BOT_TOKEN=...` et `TELEGRAM_CHAT_ID=...`.

Sans ces deux variables, aucun message n'est envoyé ; les rapports restent dans `reports/`.

## Accès depuis le téléphone (HTTPS + mot de passe)

Le tableau de bord écoute seulement sur le VPS (127.0.0.1). Caddy le rend accessible en HTTPS,
avec un certificat gratuit renouvelé tout seul, et demande un identifiant et un mot de passe
avant toute page. Testé avec Caddy 2.8.4 : sans mot de passe 401, avec 200 ; les actions
demandent en plus le jeton ADMIN_TOKEN saisi dans la page.

Prérequis : un nom de domaine qui pointe vers l'adresse IP du VPS (enregistrement DNS « A »).
Sans domaine, un nom gratuit comme `monfoot.duckdns.org` (duckdns.org) suffit.

Sur le VPS (Debian/Ubuntu), depuis le dossier `/opt/football-intel` :

```bash
# 1. Le tableau de bord tourne en permanence (redémarre tout seul)
sudo cp deploy/footintel-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now footintel-api
curl -s http://127.0.0.1:8000/health          # attendu : {"status":"ok",...}

# 2. Installer Caddy (procédure officielle : https://caddyserver.com/docs/install)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

# 3. Choisir le mot de passe (il n'est affiché nulle part ; on copie seulement son empreinte)
caddy hash-password

# 4. Remplir deploy/Caddyfile (domaine, identifiant, empreinte), puis l'activer
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy

# 5. Ouvrir les ports web si un pare-feu est actif
sudo ufw allow 80,443/tcp
```

Ouvrir ensuite `https://<ton-domaine>/` sur le téléphone : le navigateur demande l'identifiant
et le mot de passe, puis affiche le tableau de bord. Pour saisir un pronostic ou lancer un
cycle, coller le jeton ADMIN_TOKEN dans le champ prévu (gardé pour la session seulement).

## Planification sur le VPS

Le fichier [deploy/footintel-scheduler.service](deploy/footintel-scheduler.service) lance
le planificateur avec systemd. Horaires par défaut (Africa/Lubumbashi) :
matin 09:00, soir 23:30, nuit 03:00, lundi 04:00 (réentraînement).
Modifiables avec `SCHEDULE_MORNING="0 8 * * *"` etc.

## Tests

```bash
.venv/bin/pytest -m "not live"   # unitaires + intégration (base footintel_test, données synthétiques)
.venv/bin/pytest -m live         # appelle les vraies sources pour vérifier les colonnes utilisées
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — composants et flux
- [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) — sources testées, couverture, limites
- [docs/FEATURES.md](docs/FEATURES.md) — définition de chaque variable
- [docs/DECISIONS.md](docs/DECISIONS.md) — décisions techniques et hypothèses
- [docs/RESULTS.md](docs/RESULTS.md) — résultats du backtest réel
- [PROGRESS.md](PROGRESS.md) — état d'avancement par phase
