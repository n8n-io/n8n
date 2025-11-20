# 🎯 Guide de Développement n8n

Bienvenue dans l'environnement de développement n8n !

---

## 📖 Documentation

### 🚀 Pour Commencer Rapidement
- **[QUICK_START_DEV.md](./QUICK_START_DEV.md)** - Démarrage en 2 minutes

### 🔧 Configuration Détaillée
- **[DEV_SETUP.md](./DEV_SETUP.md)** - Configuration complète de l'environnement
- **[.env.example](./.env.example)** - Variables d'environnement à configurer

### 🐳 Docker et Images
- **[DOCKER_IMAGE_BUILD.md](./DOCKER_IMAGE_BUILD.md)** - Build d'images Docker en détail
- **[docker-compose.dev.yml](./docker-compose.dev.yml)** - Configuration Docker Compose

### 🌐 Reverse Proxy
- **[REVERSE_PROXY_EXAMPLE.md](./REVERSE_PROXY_EXAMPLE.md)** - Configurations Nginx, Traefik, Caddy, Apache

### 📝 Projet n8n
- **[CLAUDE.md](./CLAUDE.md)** - Guidelines du projet n8n
- **[packages/frontend/CLAUDE.md](./packages/frontend/CLAUDE.md)** - Guidelines frontend spécifiques

---

## ⚡ Démarrage Rapide (TL;DR)

```bash
# 1. Configurer
cp .env.example .env

# 2. Builder l'image
./scripts/build-dev-image.sh

# 3. Démarrer
docker compose -f docker-compose.dev.yml pull
docker compose -f docker-compose.dev.yml up -d

# 4. Accéder
open http://localhost:5678
```

---

## 🛠️ Scripts Utiles

| Script | Description |
|--------|-------------|
| `./scripts/build-dev-image.sh` | Trigger le build d'image via GitHub Actions |
| `source docker-compose.dev.aliases.sh` | Charge les aliases bash pour dev |

---

## 📋 Commandes Fréquentes

### Développement Quotidien

```bash
# Démarrer l'environnement
docker compose -f docker-compose.dev.yml up -d

# Voir les logs
docker compose -f docker-compose.dev.yml logs -f

# Arrêter l'environnement
docker compose -f docker-compose.dev.yml down
```

### Build et Déploiement

```bash
# Builder une nouvelle image
./scripts/build-dev-image.sh

# Surveiller le build
gh run watch

# Pull et redémarrer
docker compose -f docker-compose.dev.yml pull
docker compose -f docker-compose.dev.yml up -d --force-recreate
```

### Aliases (Optionnels)

```bash
# Charger les aliases
source docker-compose.dev.aliases.sh

# Utiliser les aliases
n8n-up          # Démarrer
n8n-logs        # Voir les logs
n8n-down        # Arrêter
n8n-build       # Builder nouvelle image
n8n-db          # Accéder à PostgreSQL
```

---

## 🌟 Features du Mode Développement

| Feature | Production | Développement |
|---------|-----------|---------------|
| **Enterprise Mode** | Licence requise | ✅ Activé sans licence |
| **Logs** | Normal | 🔍 Debug verbose |
| **Database Port** | Fermé | ✅ Exposé (5432) |
| **Data Pruning** | 14 jours | ♾️ Désactivé |
| **Timeouts** | Standard | ⏱️ 1-2h (debugging) |
| **Image Source** | Docker Hub | 🏗️ GHCR (custom builds) |
| **Webhook URL** | Production domain | 🧪 n8n.making.codes |

---

## 🎯 Workflows Typiques

### 1️⃣ Tester une Nouvelle Feature

```bash
# Créer une branche
git checkout -b feature/ma-feature

# Faire vos modifications
# ... code ...

# Builder l'image
./scripts/build-dev-image.sh

# Configurer .env
echo "BRANCH_NAME=feature-ma-feature" > .env
echo "GITHUB_REPOSITORY_OWNER=kodflow" >> .env

# Tester
docker compose -f docker-compose.dev.yml pull
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml logs -f
```

### 2️⃣ Changer de Branche

```bash
# Arrêter les services
docker compose -f docker-compose.dev.yml down

# Changer de branche
git checkout autre-branche

# Mettre à jour l'image
echo "BRANCH_NAME=autre-branche" > .env
echo "GITHUB_REPOSITORY_OWNER=kodflow" >> .env

# Redémarrer
docker compose -f docker-compose.dev.yml pull
docker compose -f docker-compose.dev.yml up -d
```

### 3️⃣ Reset Complet

```bash
# Tout supprimer (containers + volumes + images)
docker compose -f docker-compose.dev.yml down -v
rm -rf volumes/

# Redémarrer from scratch
docker compose -f docker-compose.dev.yml up -d
```

---

## 🔗 Accès aux Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **n8n Interface** | http://localhost:5678 | - |
| **n8n Webhooks** | https://n8n.making.codes | - |
| **PostgreSQL** | localhost:5432 | `n8n_dev_user` / `dev_password_123` |
| **Database Name** | - | `n8n_dev_db` |

---

## 🐛 Troubleshooting

### Le Container ne Démarre pas
```bash
docker compose -f docker-compose.dev.yml logs
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```

### L'Image ne se Pull pas
```bash
gh auth token | docker login ghcr.io -u kodflow --password-stdin
docker compose -f docker-compose.dev.yml pull
```

### PostgreSQL ne Répond pas
```bash
docker compose -f docker-compose.dev.yml restart postgres
# Ou reset complet:
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

---

## 📚 Ressources Supplémentaires

### Documentation Officielle n8n
- [n8n Documentation](https://docs.n8n.io/)
- [n8n GitHub](https://github.com/n8n-io/n8n)
- [n8n Community](https://community.n8n.io/)

### Docker & CI/CD
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Docker Compose](https://docs.docker.com/compose/)

### Outils de Développement
- [GitHub CLI](https://cli.github.com/)
- [pnpm](https://pnpm.io/)
- [PostgreSQL](https://www.postgresql.org/docs/)

---

## 🆘 Support

### Documentation
Consultez d'abord les fichiers de documentation ci-dessus.

### Problème Persistant ?
1. Vérifier les logs : `docker compose -f docker-compose.dev.yml logs`
2. Reset complet : `docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml up -d`
3. Consulter [DOCKER_IMAGE_BUILD.md](./DOCKER_IMAGE_BUILD.md) pour les détails sur le build

### Questions sur n8n
- [n8n Community Forum](https://community.n8n.io/)
- [GitHub Issues](https://github.com/n8n-io/n8n/issues)

---

## 📝 Notes Importantes

⚠️ **Fichiers à ne JAMAIS commiter :**
- `docker-compose.dev.yml` - Configuration spécifique au dev
- `.env` - Variables d'environnement personnelles
- `volumes/` - Données locales des containers

✅ **Fichiers à commiter :**
- `.env.example` - Template de configuration
- `scripts/build-dev-image.sh` - Script de build
- `*.md` - Documentation

---

## 🔐 Sécurité

⚠️ **IMPORTANT** : Cette configuration est **UNIQUEMENT** pour le développement local !

- Ne jamais utiliser les credentials de dev en production
- Ne jamais exposer le port PostgreSQL (5432) en production
- Ne jamais utiliser `N8N_DEV_ENTERPRISE_MODE=true` en production
- Les timeouts allongés sont dangereux en production

---

**Bon développement ! 🚀**
