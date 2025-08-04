![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# Nurx - Қазақстандағы алғашқы автоматтандыру жүйесі

Nurx - техникалық командаларға арналған қауіпсіз жұмыс ағындарын автоматтандыру платформасы. Қазақ тіліндегі алғашқы толыққанды автоматтандыру шешімі ретінде, Nurx кодтың икемділігін код жазбай жұмыс істеудің жылдамдығымен біріктіреді. 400+ интеграция, жергілікті AI мүмкіндіктері және әділ код лицензиясымен Nurx сізге деректеріңіз бен орналастырыңыз үстінен толық бақылауды сақтай отырып, қуатты автоматтандыруларды құруға мүмкіндік береді.

![n8n.io - Screenshot](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot-readme.png)

## Негізгі мүмкіндіктер

- **Қажет болған кезде код жазыңыз**: JavaScript/Python жазыңыз, npm пакеттерін қосыңыз немесе визуалды интерфейсті пайдаланыңыз
- **AI-ға негізделген платформа**: Өз деректеріңіз бен модельдеріңізбен LangChain негізінде AI агент жұмыс ағындарын құрыңыз
- **Толық бақылау**: Біздің әділ код лицензиямызбен өз серверіңізде орналастырыңыз немесе [бұлтты ұсынысымызды](https://app.n8n.cloud/login) пайдаланыңыз
- **Кәсіпорынға дайын**: Жетілдірілген рұқсаттар, SSO және ауа тосқауылымен орналастыру
- **Белсенді қауымдастық**: 400+ интеграция және 900+ дайын [үлгілер](https://n8n.io/workflows)

## Жылдам бастау

Nurx жүйесін [npx](https://docs.n8n.io/hosting/installation/npm/) арқылы бірден сынаңыз ([Node.js](https://nodejs.org/en/) қажет):

```
npx nurx
```

Or deploy with [Docker](https://docs.n8n.io/hosting/installation/docker/):

```
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

Access the editor at http://localhost:5678

## Resources

- 📚 [Documentation](https://docs.n8n.io)
- 🔧 [400+ Integrations](https://n8n.io/integrations)
- 💡 [Example Workflows](https://n8n.io/workflows)
- 🤖 [AI & LangChain Guide](https://docs.n8n.io/langchain/)
- 👥 [Community Forum](https://community.n8n.io)
- 📖 [Community Tutorials](https://community.n8n.io/c/tutorials/28)

## Support

Need help? Our community forum is the place to get support and connect with other users:
[community.n8n.io](https://community.n8n.io)

## License

n8n is [fair-code](https://faircode.io) distributed under the [Sustainable Use License](https://github.com/n8n-io/n8n/blob/master/LICENSE.md) and [n8n Enterprise License](https://github.com/n8n-io/n8n/blob/master/LICENSE_EE.md).

- **Source Available**: Always visible source code
- **Self-Hostable**: Deploy anywhere
- **Extensible**: Add your own nodes and functionality

[Enterprise licenses](mailto:license@n8n.io) available for additional features and support.

Additional information about the license model can be found in the [docs](https://docs.n8n.io/reference/license/).

## Contributing

Found a bug 🐛 or have a feature idea ✨? Check our [Contributing Guide](https://github.com/n8n-io/n8n/blob/master/CONTRIBUTING.md) to get started.

## Join the Team

Want to shape the future of automation? Check out our [job posts](https://n8n.io/careers) and join our team!

## What does n8n mean?

**Short answer:** It means "nodemation" and is pronounced as n-eight-n.

**Long answer:** "I get that question quite often (more often than I expected) so I decided it is probably best to answer it here. While looking for a good name for the project with a free domain I realized very quickly that all the good ones I could think of were already taken. So, in the end, I chose nodemation. 'node-' in the sense that it uses a Node-View and that it uses Node.js and '-mation' for 'automation' which is what the project is supposed to help with. However, I did not like how long the name was and I could not imagine writing something that long every time in the CLI. That is when I then ended up on 'n8n'." - **Jan Oberhauser, Founder and CEO, n8n.io**
