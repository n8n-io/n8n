# 🚀 Quick Start - Développement n8n

Guide rapide pour démarrer avec l'environnement de développement n8n.

---

## ⚡ Démarrage Ultra-Rapide (2 minutes)

### 1. Configurer l'environnement

```bash
# Copier l'exemple de configuration
cp .env.example .env
```

### 2. Builder l'image Docker (via GitHub Actions)

```bash
# Lancer le script helper
./scripts/build-dev-image.sh

# Ou manuellement
gh workflow run docker-build-dev.yml
gh run watch  # Surveiller le build (~5-10 min)
```

### 3. Démarrer n8n

```bash
# Pull l'image buildée
docker compose -f docker-compose.dev.yml pull

# Démarrer tous les services
docker compose -f docker-compose.dev.yml up -d

# Voir les logs
docker compose -f docker-compose.dev.yml logs -f
```

### 4. Accéder à n8n

- **Interface** : http://localhost:5678
- **Webhooks** : https://n8n.making.codes

---

## 📋 Commandes Essentielles

### Gestion des Services

```bash
# Démarrer
docker compose -f docker-compose.dev.yml up -d

# Arrêter
docker compose -f docker-compose.dev.yml down

# Redémarrer après un pull d'image
docker compose -f docker-compose.dev.yml pull
docker compose -f docker-compose.dev.yml up -d --force-recreate

# Voir les logs
docker compose -f docker-compose.dev.yml logs -f

# Logs d'un service spécifique
docker compose -f docker-compose.dev.yml logs -f n8n
docker compose -f docker-compose.dev.yml logs -f postgres

# Redémarrer un service
docker compose -f docker-compose.dev.yml restart n8n
```

### Build d'Images

```bash
# Trigger un build GitHub Actions
./scripts/build-dev-image.sh

# Surveiller le build
gh run watch

# Lister les builds récents
gh run list --workflow=docker-build-dev.yml
```

### Base de Données

```bash
# Accéder à PostgreSQL
docker exec -it n8n-postgresql-dev psql -U n8n_dev_user -d n8n_dev_db

# Backup de la DB
docker exec n8n-postgresql-dev pg_dump -U n8n_dev_user n8n_dev_db > backup.sql

# Restore de la DB
cat backup.sql | docker exec -i n8n-postgresql-dev psql -U n8n_dev_user -d n8n_dev_db

# Reset complet (⚠️ supprime toutes les données)
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

### Nettoyage

```bash
# Arrêter et supprimer les containers
docker compose -f docker-compose.dev.yml down

# Supprimer aussi les volumes (⚠️ perte de données)
docker compose -f docker-compose.dev.yml down -v

# Nettoyer les images inutilisées
docker image prune -a

# Nettoyer tout Docker
docker system prune -a --volumes
```

---

## 🔧 Configuration Avancée

### Utiliser une Branche Différente

1. Modifier `.env` :
   ```env
   BRANCH_NAME=ma-nouvelle-branche
   ```

2. Builder l'image pour cette branche :
   ```bash
   gh workflow run docker-build-dev.yml -f branch=ma-nouvelle-branche
   ```

3. Attendre le build puis pull :
   ```bash
   docker compose -f docker-compose.dev.yml pull
   docker compose -f docker-compose.dev.yml up -d
   ```

### Utiliser un Build Local

Si vous développez activement et voulez tester sans passer par la CI :

1. Modifier `docker-compose.dev.yml` :
   ```yaml
   # Remplacer
   image: ghcr.io/...

   # Par
   build:
     context: .
     dockerfile: docker/images/n8n/Dockerfile
   ```

2. Builder localement :
   ```bash
   pnpm build:n8n
   docker compose -f docker-compose.dev.yml up -d --build
   ```

### Accéder aux Containers

```bash
# Shell dans le container n8n
docker exec -it n8n-dev sh

# Shell dans PostgreSQL
docker exec -it n8n-postgresql-dev sh

# Exécuter une commande n8n
docker exec n8n-dev n8n --version
```

---

## 🐛 Debugging

### Les Containers ne Démarrent pas

```bash
# Vérifier les logs
docker compose -f docker-compose.dev.yml logs

# Vérifier l'état des containers
docker ps -a

# Recréer les containers
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```

### L'Image ne se Pull pas

```bash
# Vérifier que l'image existe sur GHCR
gh run list --workflow=docker-build-dev.yml

# S'authentifier à GHCR
gh auth token | docker login ghcr.io -u kodflow --password-stdin

# Forcer le pull
docker pull ghcr.io/kodflow/n8n:branch-feature-dev-enterprise-mode
```

### PostgreSQL ne Répond pas

```bash
# Vérifier la santé de PostgreSQL
docker inspect n8n-postgresql-dev | grep -A 10 Health

# Redémarrer PostgreSQL
docker compose -f docker-compose.dev.yml restart postgres

# Recréer le volume DB (⚠️ perte de données)
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

### n8n ne Démarre pas

```bash
# Voir les logs détaillés
docker compose -f docker-compose.dev.yml logs -f n8n

# Vérifier les variables d'environnement
docker exec n8n-dev env | grep N8N

# Tester la healthcheck
docker exec n8n-dev wget --no-verbose --tries=1 --spider http://localhost:5678/healthz
```

---

## 📊 Monitoring

### Vérifier que Tout Fonctionne

```bash
# Health check de tous les services
docker compose -f docker-compose.dev.yml ps

# Tester n8n
curl http://localhost:5678/healthz

# Tester PostgreSQL
docker exec n8n-postgresql-dev pg_isready -U n8n_dev_user
```

### Statistiques des Containers

```bash
# Utilisation CPU/RAM en temps réel
docker stats

# Espace disque utilisé
docker system df
```

---

## 🎯 Workflows Typiques

### Développement Quotidien

```bash
# Matin - Démarrer l'environnement
docker compose -f docker-compose.dev.yml up -d

# Soir - Arrêter l'environnement
docker compose -f docker-compose.dev.yml down
```

### Tester une Nouvelle Feature

```bash
# 1. Créer une branche
git checkout -b feature/ma-feature

# 2. Faire vos modifications
# ... code ...

# 3. Builder l'image
./scripts/build-dev-image.sh

# 4. Mettre à jour .env
echo "BRANCH_NAME=feature-ma-feature" >> .env

# 5. Tester
docker compose -f docker-compose.dev.yml pull
docker compose -f docker-compose.dev.yml up -d

# 6. Voir les logs
docker compose -f docker-compose.dev.yml logs -f n8n
```

### Changer de Branche

```bash
# 1. Arrêter les services
docker compose -f docker-compose.dev.yml down

# 2. Changer de branche git
git checkout autre-branche

# 3. Mettre à jour .env
echo "BRANCH_NAME=autre-branche" > .env
echo "GITHUB_REPOSITORY_OWNER=kodflow" >> .env

# 4. Pull la nouvelle image
docker compose -f docker-compose.dev.yml pull

# 5. Redémarrer
docker compose -f docker-compose.dev.yml up -d
```

---

## 📚 Documentation Complète

- **[DEV_SETUP.md](./DEV_SETUP.md)** - Guide complet de configuration
- **[DOCKER_IMAGE_BUILD.md](./DOCKER_IMAGE_BUILD.md)** - Détails sur le build d'images
- **[REVERSE_PROXY_EXAMPLE.md](./REVERSE_PROXY_EXAMPLE.md)** - Config Nginx/Traefik/Caddy
- **[CLAUDE.md](./CLAUDE.md)** - Guidelines du projet n8n

---

## 🆘 Besoin d'Aide ?

### Problème avec les Images Docker
→ Voir [DOCKER_IMAGE_BUILD.md](./DOCKER_IMAGE_BUILD.md)

### Problème avec le Reverse Proxy
→ Voir [REVERSE_PROXY_EXAMPLE.md](./REVERSE_PROXY_EXAMPLE.md)

### Problème avec l'Environnement de Dev
→ Voir [DEV_SETUP.md](./DEV_SETUP.md)

### Problème Général
```bash
# Reset complet
docker compose -f docker-compose.dev.yml down -v
rm -rf volumes/
docker compose -f docker-compose.dev.yml up -d
```

---

## ⚙️ Variables d'Environnement Importantes

| Variable | Description | Valeur par Défaut |
|----------|-------------|-------------------|
| `GITHUB_REPOSITORY_OWNER` | Owner du repo GitHub | `kodflow` |
| `BRANCH_NAME` | Nom de la branche à utiliser | `feature-dev-enterprise-mode` |
| `N8N_DEV_ENTERPRISE_MODE` | Active les features Enterprise | `true` |
| `WEBHOOK_URL` | URL pour les webhooks | `https://n8n.making.codes` |

---

## ✨ Features Activées en Mode Dev

- ✅ **Mode Enterprise** - Toutes les features premium sans licence
- ✅ **Logs Debug** - Logs verbeux pour debugging
- ✅ **PostgreSQL Exposé** - Accès direct sur port 5432
- ✅ **Pas de Data Pruning** - Conservation de toutes les exécutions
- ✅ **Timeouts Longs** - 1h/2h pour permettre le debugging
- ✅ **Metrics Activées** - Pour monitoring
- ✅ **Hot Reload** - Support (si volumes montés)
