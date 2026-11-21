# Features

Règle générale : pour un match du jour J, toutes les features sont calculées avec
l'état à la fin du jour J-1. Les résultats du jour J ne sont intégrés qu'après.
Test : `tests/test_unit.py::test_features_ignore_same_day_and_future_results`.

Suffixe `_h` = équipe à domicile, `_a` = équipe à l'extérieur.

| Feature | Définition | Données manquantes |
|---|---|---|
| `elo_home`, `elo_away` | Elo avant le match, commun à toutes les compétitions (championnats, contexte, coupes). K = 20, avantage domicile 60 (0 sur terrain neutre), multiplicateur selon l'écart de buts (1 ; 1,5 ; (11+écart)/8). | Jamais manquant. Départ : Elo du championnat de l'équipe (D14), moins 80 si elle arrive après la première saison du championnat ; 1380 pour un club vu seulement en coupe. Entre deux saisons, 80 % de l'écart à l'Elo de départ du championnat est conservé. |
| `elo_diff` | `elo_home - elo_away` (sans l'avantage domicile). | — |
| `form5_ppg`, `form10_ppg` | Points par match sur les 5 / 10 derniers matchs, toutes compétitions suivies. | NaN si aucun match antérieur ; moyenne sur les matchs disponibles sinon. |
| `gf5`, `ga5` | Buts marqués / encaissés par match, 5 derniers matchs. | Idem. |
| `venue5_ppg` | Points par match sur les 5 derniers matchs à domicile (pour `_h`) ou à l'extérieur (pour `_a`). | NaN si aucun. |
| `shots5_for`, `shots5_against`, `sot5_for`, `sot5_against` | Tirs et tirs cadrés pour / contre, moyenne des 5 derniers matchs. | Les matchs sans statistiques sont ignorés ; NaN si aucun. |
| `rest_days` | Jours depuis le dernier match suivi, plafonnés à 30. | NaN pour le premier match. |
| `n_prior` | Nombre de matchs antérieurs de l'équipe dans la base. | 0. Sert au contrôle « données suffisantes » (minimum 5). |
| `games_7d`, `games_14d`, `games_30d` | Matchs joués par l'équipe dans les 7 / 14 / 30 jours précédents, toutes compétitions en base. | 0 si aucun. |
| `europe_7d` | 1 si l'équipe a joué un match de coupe d'Europe dans les 7 jours précédents. | 0. |
| `is_european`, `is_domestic_cup` | Type de la compétition du match. | — |
| `neutral` | 1 pour une finale sur terrain neutre ; l'avantage du terrain Elo vaut alors 0. | 0. |
| `comp_home_rate`, `comp_draw_rate`, `comp_btts_rate`, `comp_over25_rate` | Taux de la compétition sur les 730 jours avant la veille du match, rapprochés du taux de long terme de la compétition avec 150 matchs fictifs de poids (lui-même rapproché du taux de tout le football en base). | Taux de long terme, puis taux global. |
| `comp_goals_mean`, `comp_home_goal_adv` | Buts par match et écart de buts domicile-extérieur, même fenêtre et même rapprochement. | Idem. |
| `season_progress` | Part de la saison de championnat déjà jouée par l'équipe à domicile (0 à 1). | NaN en coupe. |
| `is_knockout`, `is_final_stage` | Tour à élimination directe ; finale. | 0. |
| `is_second_leg`, `first_leg_gd` | Match retour ; écart de buts du match aller vu par l'équipe qui reçoit au retour (connu avant le match). | 0. |
| `mkt_p_home/draw/away` | Probabilités implicites des cotes 1X2, marge retirée proportionnellement : `(1/cote) / Σ(1/cote)`. Cote utilisée : dernier relevé `fixtures@` antérieur à l'heure de prédiction, sinon moyenne du marché avant clôture, sinon Bet365 avant clôture. | NaN si une des trois cotes manque. |
| `mkt_overround` | `Σ(1/cote)` : la marge brute du bookmaker. | Idem. |

Tests de non-fuite : `test_features_ignore_same_day_and_future_results` et la vérification
manuelle des tendances (résultats modifiés le jour même et après : valeurs inchangées).

Traitement dans les modèles ML : imputation par la médiane du pli d'entraînement **et**
colonne indicatrice de valeur manquante, puis standardisation bornée à ±5 écarts-types.

## Pas encore construites (données indisponibles)

xG/xGA, occasions créées, possession, pressing (PPDA), formations, rôles, absences,
suspensions, compositions, importance des joueurs, distance de déplacement, prolongations
de coupes nationales, météo : aucune source autorisée connectée ne les fournit.
Elles dépendent d'API-Football. La table `team_match_tactics` est prête à les recevoir.
