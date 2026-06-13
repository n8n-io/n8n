![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n - Automatisation de Flux de Travail Sécurisée pour les Équipes Techniques

n8n est une plateforme d'automatisation de flux de travail qui offre aux équipes techniques la flexibilité du code avec la rapidité du no-code. Avec plus de 400 intégrations, des capacités natives d'IA et une licence fair-code, n8n vous permet de créer des automatisations puissantes tout en gardant un contrôle total sur vos données et déploiements.

![n8n.io - Screenshot](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot-readme.png)

## Fonctionnalités Clés

- **Codez quand vous en avez besoin**: Codez en JavaScript/Python, ajoutez des paquets npm ou utilisez l'interface visuelle
- **Platforme Native IA**: Créez des flux de travail avec des agents IA basés sur LangChain avec vos propres données et modèles
- **Contrôle Total**: Auto-hébergez avec notre licence fair-code ou utilisez notre [offre cloud](https://app.n8n.cloud/login)
- **Prêt pour l'Entreprise**: Permissions avancées, SSO et déploiements air-gapped
- **Communauté Active**: Plus de 400 intégrations et plus de 900 [modèles prêts à l'emploi](https://n8n.io/workflows)

## Démarrage Rapide

Essayez n8n instantanément avec [npx](https://docs.n8n.io/hosting/installation/npm/) (nécessite [Node.js](https://nodejs.org/en/)):

```
npx n8n
```

Ou déployez avec [Docker](https://docs.n8n.io/hosting/installation/docker/):

```
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

Accédez à l'éditeur à l'adresse suivante: http://localhost:5678

## Resources

- 📚 [Documentation](https://docs.n8n.io)
- 🔧 [400+ Intégrations](https://n8n.io/integrations)
- 💡 [Exemples de Flux de Travail](https://n8n.io/workflows)
- 🤖 [Guide IA & LangChain](https://docs.n8n.io/langchain/)
- 👥 [Forum Communautaire](https://community.n8n.io)
- 📖 [Tutoriels Communautaires](https://community.n8n.io/c/tutorials/28)

## Support

Besoin d'aide? Notre forum communautaire est l'endroit où obtenir du support et connecter avec d'autres utilisateurs :
[community.n8n.io](https://community.n8n.io)

## Licence

n8n est distribué sous la licence [fair-code](https://faircode.io) et la [ Licence d'Utilisation Durable](https://github.com/n8n-io/n8n/blob/master/LICENSE.md) et la [Licence Entreprise n8n.](https://github.com/n8n-io/n8n/blob/master/LICENSE_EE.md).

- **Source Disponible**: Code source toujours visible
- **Auto-hébergeable**: Déployez partout
- **Extensible**: Ajoutez vos propres nœuds et fonctionnalités

[Licences Entreprise](mailto:license@n8n.io) disponibles pour des fonctionnalités et un support supplémentaires.

Des informations supplémentaires sur le modèle de licence peuvent être trouvées dans la [documentation](https://docs.n8n.io/reference/license/).

## Contribuer

Vous avez trouvé un bug 🐛 ou une idée de fonctionnalité ✨ ? Consultez notre [Guide de Contribution](https://github.com/n8n-io/n8n/blob/master/CONTRIBUTING.md) pour commencer.

## Rejoignez l'Équipe

Vous voulez façonner l'avenir de l'automatisation? Consultez nos [offres d'emploi](https://n8n.io/careers) et rejoinez notre équipe!

## Que signifie n8n?

**Réponse courte :** Cela signifie "nodemation" et et se prononce n-huit-n.

**Réponse Longue:** "Je reçois cette question assez souvent (plus souvent que je ne l'avais prévu), donc j'ai décidé qu'il était probablement mieux de répondre ici. En cherchant un bon nom pour le projet avec un domaine libre, j'ai très vite réalisé que tous les bons noms auxquels je pensais étaient déjà pris. Donc, à la fin, j'ai choisi nodemation. 'node-' dans le sens où il utilise une vue Node et qu'il utilise Node.js et '-mation' pour 'automation', ce que le projet est censé aider à faire. Cependant, je n'aimais pas la longueur du nom et je ne pouvais pas imaginer écrire un nom aussi long à chaque fois dans le CLI. C'est à ce moment-là que j'ai fini par choisir 'n8n'." - **Jan Oberhauser, Fondateur et CEO, n8n.io**
