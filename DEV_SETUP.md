# Configuration de Développement Local n8n

## Vue d'ensemble

Le fichier `docker-compose.dev.yml` (non commité) fournit une configuration Docker optimisée pour le développement local de n8n.

## Axes d'amélioration par rapport à la configuration de production

### 1. **Mode Enterprise Activé** 🚀
- `N8N_DEV_ENTERPRISE_MODE: "true"` - Active toutes les fonctionnalités Enterprise sans licence
- Permet de tester les features premium en développement

### 2. **Environnement de Développement**
- `NODE_ENV: development` au lieu de `production`
- Logs plus verbeux : `N8N_LOG_LEVEL: debug`
- `N8N_LOG_OUTPUT: console` pour un debugging facilité

### 3. **Sécurité Assouplie**
- Protocole HTTP au lieu de HTTPS pour simplifier le dev local
- `NODE_TLS_REJECT_UNAUTHORIZED: "0"` pour les tests avec certificats custom
- Timeouts augmentés pour permettre le debugging

### 4. **Base de Données Exposée**
- Port PostgreSQL `5432` exposé sur localhost
- Permet l'inspection directe de la DB avec des outils comme pgAdmin, DBeaver, etc.
- Credentials simplifiés pour le dev : `n8n_dev_user` / `dev_password_123`

### 5. **Volumes Locaux**
- Utilisation de chemins relatifs (`./volumes/`) au lieu de chemins absolus
- Facilite le partage entre développeurs
- Les données persistent localement dans le repo (mais sont gitignorées)

### 6. **Images Pre-Built via CI**
- Utilise une image Docker pré-construite via GitHub Actions
- Plus rapide que de builder localement (pas besoin de `pnpm build`)
- Images stockées dans GitHub Container Registry (GHCR)
- Tag format : `ghcr.io/OWNER/n8n:branch-BRANCH_NAME`

### 7. **Optimisations Dev**
- `EXECUTIONS_DATA_PRUNE: "false"` - Garde toutes les exécutions pour analyse
- Timeouts allongés (1h/2h) pour le debugging
- Fonctions Node.js externes autorisées : `NODE_FUNCTION_ALLOW_EXTERNAL: "*"`

### 8. **Telemetry et Notifications Désactivées**
- `N8N_DIAGNOSTICS_ENABLED: "false"`
- `N8N_HIRING_BANNER_ENABLED: "false"`
- `N8N_VERSION_NOTIFICATIONS_ENABLED: "false"`
- Interface plus propre sans distractions

### 9. **Nommage Différencié**
- Containers : `n8n-dev` et `n8n-postgresql-dev`
- Évite les conflits avec d'éventuels containers de production
- Base de données : `n8n_dev_db` pour séparer les environnements

### 10. **Hot Reload (Optionnel)**
- Possibilité de monter le code source local (commenté par défaut)
- Décommentez la ligne dans les volumes pour activer le hot reload

## Construction de l'Image Docker

### Option 1 : Utiliser une Image Pré-construite (Recommandé)

**Étape 1 : Builder l'image via GitHub Actions**

Utilisez le script helper pour déclencher le build :

```bash
./scripts/build-dev-image.sh
```

Ou manuellement via GitHub CLI :

```bash
# Pour la branche actuelle
gh workflow run docker-build-dev.yml

# Pour une branche spécifique
gh workflow run docker-build-dev.yml -f branch=feature/ma-feature

# Surveiller la progression
gh run watch
```

**Étape 2 : Configurer l'environnement**

Créez un fichier `.env` à la racine du projet :

```bash
cp .env.example .env
```

Éditez `.env` avec vos valeurs :

```env
GITHUB_REPOSITORY_OWNER=kodflow
BRANCH_NAME=feature-dev-enterprise-mode
```

**Étape 3 : Utiliser l'image**

```bash
# Pull l'image depuis GHCR
docker compose -f docker-compose.dev.yml pull

# Démarrer les services
docker compose -f docker-compose.dev.yml up -d
```

### Option 2 : Build Local (Lent mais utile pour développement actif)

Si vous modifiez le code fréquemment et voulez tester rapidement :

```bash
# Modifier temporairement docker-compose.dev.yml
# Remplacer:
#   image: ghcr.io/...
# Par:
#   build:
#     context: .
#     dockerfile: docker/images/n8n/Dockerfile

# Puis builder
pnpm build:n8n  # Build l'application d'abord
docker compose -f docker-compose.dev.yml up -d --build
```

## Commandes Utiles

### Démarrage
```bash
docker compose -f docker-compose.dev.yml up -d
```

### Arrêt
```bash
docker compose -f docker-compose.dev.yml down
```

### Logs en temps réel
```bash
docker compose -f docker-compose.dev.yml logs -f
```

### Rebuild complet
```bash
docker compose -f docker-compose.dev.yml up -d --build
```

### Reset total (⚠️ supprime les données)
```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d --build
```

### Accès à la base de données
```bash
# Via psql directement
docker exec -it n8n-postgresql-dev psql -U n8n_dev_user -d n8n_dev_db

# Ou avec un client GUI sur localhost:5432
# Credentials: n8n_dev_user / dev_password_123
```

## Différences avec la Production

| Aspect | Production | Développement |
|--------|-----------|---------------|
| Image | `n8nio/n8n:latest` | GHCR (pre-built) |
| NODE_ENV | `production` | `development` |
| Protocol | HTTPS | HTTP |
| Webhook URL | `https://n8n.kodmain.synology.me` | `https://n8n.making.codes` |
| Data Pruning | Activé (14 jours) | Désactivé |
| Log Level | Normal | Debug |
| Volumes | Chemins absolus Synology | Chemins relatifs locaux |
| DB Port | Non exposé | Exposé sur 5432 |
| Enterprise | Nécessite licence | Mode dev activé |

## Recommandations

### Pour le développement de features
1. Utilisez `docker-compose.dev.yml`
2. Les logs détaillés vous aideront au debugging
3. Profitez du mode Enterprise pour tester toutes les fonctionnalités

### Pour tester en conditions quasi-production
1. Utilisez votre config originale (sans la commiter)
2. Changez `NODE_ENV` en `production`
3. Activez le data pruning

### Migration vers Production
1. Copiez `docker-compose.dev.yml` vers un nouveau fichier
2. Changez les variables d'environnement selon le tableau ci-dessus
3. Utilisez des secrets/variables d'environnement pour les credentials
4. Supprimez `N8N_DEV_ENTERPRISE_MODE` (utilisez une vraie licence)

## 📊 Accès aux Services

- **Interface n8n**: http://localhost:5678 (accès local direct)
- **Webhooks n8n**: https://n8n.making.codes (domaine externe configuré)
- **PostgreSQL**: localhost:5432
  - User: `n8n_dev_user`
  - Password: `dev_password_123`
  - Database: `n8n_dev_db`

> **Note**: Le domaine `n8n.making.codes` est configuré et pointe vers votre serveur. Assurez-vous que votre reverse proxy (Nginx, Traefik, Caddy) route le trafic HTTPS vers le container n8n sur le port 5678.

## Troubleshooting

### Les containers ne démarrent pas
```bash
# Vérifier les logs
docker compose -f docker-compose.dev.yml logs

# Vérifier la santé du container
docker ps -a
```

### La base de données ne répond pas
```bash
# Vérifier le healthcheck
docker inspect n8n-postgresql-dev | grep -A 10 Health

# Recréer le volume DB
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

### Rebuild nécessaire après modifications
```bash
# Force rebuild
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up -d
```

## Sécurité

⚠️ **IMPORTANT** : Cette configuration est **UNIQUEMENT** pour le développement local !

- N'utilisez jamais ces credentials en production
- Ne commitez jamais `docker-compose.dev.yml` avec vos credentials
- Le mode dev Enterprise ne doit jamais être utilisé en production
- Les timeouts allongés et la sécurité assouplie sont dangereux en production
