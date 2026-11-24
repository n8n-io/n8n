# Sources de données

Tout ce qui suit a été vérifié par de vrais appels les 2026-10-21 et 2026-10-22.

## Actives

### football-data.co.uk — championnats

| Élément | Constat |
|---|---|
| Accès | Libre, sans clé. `/mmz4281/{yyYY}/{DIV}.csv` (format complet) et `/new/{PAYS}.csv` (un fichier par pays, toutes saisons). |
| Cibles | E0, SP1, I1, D1 : 2005-06 à 2026-27. Résultats, mi-temps, tirs, tirs cadrés, fautes, corners, cartons, cotes avant clôture et de clôture. |
| Contexte (format complet) | F1, N1, P1, B1, T1, SC0, G1 : 2005-06 à 2026-27, mêmes colonnes. |
| Divisions inférieures | E1, E2, E3, EC, SP2, I2, D2, F2, SC1, SC2, SC3 : 2005-06 à 2026-27, mêmes colonnes (90 688 matchs). |
| Contexte (`/new/`) | AUT, SWZ, DNK, NOR, SWE, POL : depuis 2012. **Résultats et cotes de clôture seulement**, pas de statistiques ni de cotes avant match. |
| Heure | Colonne `Time` à partir de 2019-20 ; fuseau non documenté (hypothèse Europe/London). |
| Matchs répétés | En Écosse, Suisse, Autriche, au Danemark, une affiche se rejoue sur le même terrain dans la saison : la clé des championnats de contexte inclut la date. |
| xG, compositions, blessures | **Absents.** |
| Conditions | `disclaimer.php` : pas de restriction d'usage personnel trouvée. À relire avant tout usage commercial. |

### openfootball / champions-league — coupes d'Europe

| Élément | Constat |
|---|---|
| Licence | Domaine public. |
| Couverture | C1 2011-12 à 2025-26 (15 saisons) ; C3 2020-21 à 2024-25 ; C4 2021-22 à 2024-25. 3 390 matchs importés, nombre identique à l'en-tête de chaque fichier. |
| Manque | **Saison en cours 2026-27 absente.** C3 2025-26 et C4 2025-26 absentes. Aucune cote, aucune statistique, aucune composition. |
| Format | Score à 90 minutes, prolongation, tirs au but ; « [awarded] » et « [cancelled] » écartés ; finale sur terrain neutre. Heures en heure d'Europe centrale. |
| Noms d'équipes | 224 noms. Correspondance avec football-data : automatique si sûre, sinon alias manuel relu (`reference/team_aliases.csv`, 35 alias). 2 erreurs automatiques trouvées à la relecture (PSG → Paris FC, Başakşehir → Istanbulspor) et corrigées. 72 clubs de pays non importés (Tchéquie, Serbie, Croatie, Chypre…) restent des équipes à part, avec peu d'historique. |

### OpenLigaDB — saison en cours des coupes d'Europe et DFB-Pokal

| Élément | Constat (2026-10-22) |
|---|---|
| Accès | `https://api.openligadb.de/getmatchdata/{ligue}/{saison}`. Sans clé, sans compte. Limite publiée : 60 requêtes par minute et par IP. |
| Licence | **ODbL 1.0, confirmée sur le site officiel** (`openligadb.de/lizenz`, 2026-10-22) : usage, copie, modification et diffusion permis, y compris commercial, avec trois conditions : citer « Daten von OpenLigaDB (www.openligadb.de), lizenziert unter ODbL 1.0 » ; redistribuer une base dérivée sous la même licence (un affichage ou un rapport n'en est pas une) ; pas de verrou technique. Noms de clubs, logos et images liées ne sont pas couverts : le système ne les utilise pas. |
| Usage équitable | `openligadb.de/nutzungsbedingungen` : peu de requêtes par jour hors matchs, départ décalé au hasard, cache local, attente croissante sur 429 et 5xx. Appliqué : 1 requête par compétition, 2 fois par jour (8 au total), départ décalé de 0 à 90 s, réponse brute gardée dans `data/raw/openligadb/`. |
| Ligues utilisées (2026) | `ucl` (C1), `uel2026` (C3), `uecl2026` (C4), `dfb` (DFB-Pokal). Choisies à la main : `ucl2026` est une copie vide de la C1. À revoir à chaque saison (`catalog.OPENLIGADB_LEAGUES`). |
| Couverture réelle | 444 matchs : C1 144 (53 résultats retenus), C3 144 (35), C4 108 (17), DFB-Pokal 48 (32). Heures en UTC, score à la mi-temps, prolongation, tirs au but, liste des buts. |
| Qualité | Saisie par des bénévoles. Chaque résultat est comparé à la liste des buts (score après le dernier but, ou nombre de buts quand les minutes manquent). 3 résultats contradictoires écartés sur 137, par exemple AZ Alkmaar–Hapoel Beer-Sheva saisi 0-0 avec trois buts. Un match écarté reste « programmé » jusqu'à correction. |
| Noms d'équipes | En allemand, sans pays (« Inter Mailand », « FC Brügge »). Correspondance **uniquement par alias manuels relus** (135 alias). L'automatique aurait rattaché « Viktoria Köln » à « Viktoria Plzeň ». 30 clubs absents de la base restent des équipes à part (clubs amateurs de la DFB-Pokal, petits clubs européens). |
| Doublons | Un match déjà connu d'une autre source (même compétition, mêmes équipes, à deux jours près) est réutilisé, jamais recréé. |
| Manque | Pas de cotes, pas de statistiques, pas de compositions. |

### football-data.org — contrôle des résultats de la Ligue des champions

| Élément | Constat (2026-10-22, clé gratuite) |
|---|---|
| Accès | `https://api.football-data.org/v4`, en-tête `X-Auth-Token`, clé en variable d'environnement `FOOTBALL_DATA_ORG_KEY` (jamais dans le dépôt). 10 requêtes par minute. |
| Couverture gratuite | 13 compétitions dont la C1, les 5 grands championnats, Championship, Eredivisie, Primeira Liga. **Pas de C3, C4 ni de coupes nationales. Pas de cotes** (option payante : réponse « Activate Odds-Package »). |
| Rôle | Source de contrôle de la C1 : elle se rattache aux matchs existants (OpenLigaDB), ne crée ni équipe ni match, complète un résultat manquant ou écarté, et journalise tout désaccord. |
| Résultat réel | 144 matchs rattachés sur 144, 54 résultats identiques sur le score final. 1 désaccord à la mi-temps (OpenLigaDB 0-0, football-data.org 0-1) et 1 résultat écarté par OpenLigaDB (Viking–Bayern, deux scores de mi-temps) rétabli : 3-3. |
| Noms d'équipes | Anglais complets avec pays (« Sporting Clube de Portugal », PRT). Alias manuels relus (36) : l'automatique aurait rattaché Sporting à Porto. |
| Conditions | `football-data.org/about` : mention « Data provided by football-data.org » visible (ajoutée au tableau de bord et aux rapports) ; après résiliation du compte, ses données ne doivent plus être affichées. |
| Priorité des scores | football-data.co.uk = football-data.org > openfootball > OpenLigaDB. Une source moins fiable n'écrase jamais un résultat. |

### The Odds API — cotes 1X2 des coupes

| Élément | Constat (2026-10-29, premier passage réel : 54 matchs de C1, C3 et C4 rattachés, 20 bookmakers, 3 crédits) |
|---|---|
| Accès | `https://api.the-odds-api.com/v4`, clé en variable d'environnement `ODDS_API_KEY` (jamais dans le dépôt). La clé passe dans l'URL : elle est masquée dans les erreurs et les journaux `httpx` sont coupés. |
| Quota | Offre gratuite : 500 crédits par mois. `/sports` est gratuit ; un appel `/odds` en `h2h` sur une région (`eu`) coûte 1 crédit ; une compétition hors saison ou une réponse vide ne coûte rien. 14 compétitions, un passage par jour (cycle du matin) : 14 crédits par jour au plus, environ 420 par mois. Arrêt automatique sous 40 crédits restants. |
| Couverture | Ligue des champions, Ligue Europa, Conference League, DFB-Pokal ; depuis D64 aussi les 5 championnats, FA Cup, EFL Cup, Copa del Rey, Coppa Italia et Coupe de France. Clé de compétition vérifiée sur `/sports` avant chaque appel. Pas de betPawa (bookmakers européens). |
| Rattachement | Jamais d'équipe ni de match créé, jamais de match modifié. Noms d'équipes par alias relus à la main (source `the_odds_api`), sinon la seule équipe récente de la compétition au nom normalisé identique (« Real Madrid CF » = « Real Madrid »), jamais le nom le plus proche. Un nom inconnu est signalé avec le nom le plus proche, pour relecture. |
| Usage | Référence de marché dans le vérificateur de cotes (probabilité moyenne des bookmakers, marge retirée, meilleure cote). **Pas lue par le modèle actif** (D49). |
| Conditions | `the-odds-api.com/terms-and-conditions.html` : stockage et affichage dans un tableau de bord autorisés ; revente comme service de données interdite. Mention non obligatoire, ajoutée quand même. |

### OddsPapi — cotes betPawa et Pinnacle (en préparation, D68)

| Élément | Constat (2026-10-30, documentation et conditions lues ; pas encore de clé) |
|---|---|
| Accès | `https://api.oddspapi.io/v4`, clé en variable d'environnement `ODDS_PAPI_KEY` (secret GitHub, jamais dans le dépôt). La clé passe dans l'URL. |
| Quota | Offre gratuite : 250 requêtes par mois, 1 par appel quel que soit le contenu. `/v4/historical-odds` est gratuit et ne compte pas. Remise à zéro le 1er du mois. |
| Couverture | betPawa Cameroun (`betpawa.cm`), pas la RD Congo ; Pinnacle. Marchés réels de betPawa à confirmer par la sonde `scripts/oddspapi_probe.py` (workflow « OddsPapi probe », 4 requêtes). |
| Conditions | `oddspapi.io/en/legal/terms` : revente ou redistribution des données comme produit interdites ; clé personnelle. Usage personnel et calculs affichés aux invités du site : autorisés. |
| Usage prévu | Comparer les cotes betPawa à la cote juste de Pinnacle sur des matchs joués (historique gratuit), puis avant les matchs. |

### betPawa RD Congo — relevés du propriétaire (D68)

Cotes lues sur les captures d'écran que le propriétaire envoie dans la conversation, écrites à la main
dans `reference/betpawa_prices.csv` (heure du relevé, match, marché, sélection, cote). Aucun robot :
les conditions de betPawa l'interdisent (D64). Évaluées par `scripts/betpawa_value.py`, chaque matin
dans le résumé du cycle quotidien.

### OneFootball — compositions et événements des grands championnats

| Élément | Constat (2026-10-29) |
|---|---|
| Accès | Pages publiques `onefootball.com`, sans clé. Données lues dans le bloc JSON `__NEXT_DATA__` de chaque page. `robots.txt` autorise les pages de compétition et de match. |
| Couverture | Premier League, LaLiga, Serie A, Bundesliga : saison en cours, matchs terminés (page des résultats + bouton « Show all results »). |
| Contenu | Compositions confirmées (11 titulaires, formation déduite des lignes), buts avec passeur, cartons, remplacements, possession, tirs, tirs cadrés. Pas de remplaçants non entrés, pas de blessures, pas d'xG. Les événements nomment les joueurs sans identifiant : seuls les titulaires sont reliés à un joueur. |
| Volume | 4 pages de résultats + 4 appels « load more », puis 1 page par match jamais lu ; 150 pages au plus par passage. Planifiée dans le cycle du matin (09:00, Africa/Lubumbashi) : environ 8 à 40 requêtes par jour. |
| Rattachement | Jamais d'équipe, de match ni de score créé. Noms d'équipes par alias relus à la main (source `onefootball`). |
| Conditions | `static.onefootball.com/legal/terms-of-use/en` : usage personnel seulement ; interdiction de « copy, record, or save » le contenu (7.4) et de tout « processing » (7.2). **Utilisée malgré tout par décision du propriétaire (D50)**, avec garde-fous. Arrêt immédiat si le projet devient public ou commercial. |
| Usage | Stockée (`lineups`, `team_match_tactics`, `match_events`, `team_match_statistics`). **Pas lue par le modèle actif.** |

### martj42/international_results — sélections nationales (D82)

| Élément | Constat |
|---|---|
| Accès | Libre, sans clé. `raw.githubusercontent.com/martj42/international_results/master/results.csv` et `goalscorers.csv`. Téléchargés chaque matin dans `DATA_DIR/international` ; la dernière copie sert si le téléchargement échoue. |
| Couverture | 49 941 matchs de sélections masculines de 1872 au 6 octobre 2026 (vérifié le 16/11/2026), tous tournois : Coupe du monde et éliminatoires, Euro, Ligue des nations, CAN, Copa América, matchs amicaux… Colonne « terrain neutre ». Buteurs et minutes jusqu'en juillet 2026. |
| Mise à jour | Après chaque fenêtre internationale, avec quelques semaines de retard. Les résultats plus récents viennent du calendrier OneFootball. |
| Contenu absent | Pas de cotes, pas de matchs à venir. |
| Conditions | Licence CC0 1.0 (domaine public). |
| Usage | Classement Elo des sélections et modèle de buts (`models/national.py`). Les lignes `teams` des sélections portent `country = 'International'` ; un nom déjà pris par un club reçoit « (sélection) » (Andorra, Monaco). |

Les matchs à venir et les résultats récents des sélections viennent des pages OneFootball (`NATIONAL_SLUGS`) : Ligue des nations, matchs amicaux, Coupe du monde, CAN, Copa América, Coupe d'Asie, Gold Cup. L'identifiant d'une nouvelle compétition se trouve avec `onefootball.com/en/competition/x-<id>`, qui redirige vers la page nommée. Les éliminatoires de la CAN n'ont pas été trouvés (identifiants 1 à 900 et 2300 à 2420 parcourus).

## Prévue, désactivée

### API-Football (api-sports.io)

Sans clé : HTTP 403, enveloppe `{get, parameters, errors, results, paging, response}`.
C'est la **seule source testée légalement utilisable** qui pourrait fournir : la saison en cours
des coupes d'Europe, les coupes nationales, les compositions, les formations, les événements,
les statistiques par joueur, les blessures et suspensions. Couverture et quotas du plan gratuit
non vérifiables sans clé. Inscription : https://dashboard.api-football.com/register

### football-data.org

Sans clé : HTTP 403 (« restricted »). Clé gratuite à l'inscription (https://www.football-data.org/client/register).
Couverture du plan gratuit non vérifiée sans clé. Candidat de secours pour le calendrier
et les résultats de la C1.

## Écartées

| Source | Test | Raison |
|---|---|---|
| ESPN (`site.api.espn.com`) | HTTP 200 sans clé ; C1 depuis 2005 avec compositions, formations depuis ~2010, 28 statistiques d'équipe, cotes. | **Conditions d'utilisation Disney/ESPN** : interdiction d'extraire les contenus « using a robot, spider, script, or other automated means […] compiling, building […] any collection of data, data set or database ». Non utilisée malgré sa richesse. |
| Understat (xG) | HTTP 200. | `robots.txt` : `Disallow: /` pour tous les robots. |
| FBref | HTTP 403. | Accès bloqué. |
| TheSportsDB (clé publique « 3 ») | HTTP 403. | Clé publique refusée. |
| Sofascore | HTTP 403 sur le site et l'API. | **Conditions d'utilisation** : « Using website content through embedding, aggregating, scraping, or reproducing without explicit consent is prohibited » ; requêtes automatiques interdites. Les bibliothèques qui y accèdent imitent le navigateur Chrome pour franchir la protection anti-robot. Non utilisée. |
| FotMob | `robots.txt` : `Disallow: /api/*`. | API interdite aux robots. |
| ClubElo | `Fixtures API deactivated` ; classement du jour HTTP 502 ; le 2026-10-28, coupure HTTPS et vérification anti-robot sur le site. | Non joignable depuis le conteneur. L'historique (copie MIT de `xgabora/Club-Football-Match-Data`, réel jusqu'au 2025-06-01) a servi au test D48. À retester depuis le VPS. |
| openfootball football.json | C1 2024-25 seulement, finale sans score. | Couverture trouée ; le dépôt `champions-league` est utilisé à la place. |

## Mode dégradé

Sans clé API, le système fonctionne sur football-data.co.uk et openfootball, plus les données
déjà en base. `footintel status` et `/api/status` l'indiquent explicitement.
