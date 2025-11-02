![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n - 技术团队的安全工作流自动化平台

n8n 是一个工作流自动化平台，为技术团队提供代码级别的灵活性，同时具备无代码的速度。通过 400+ 集成、原生 AI 能力和企业级功能，n8n 让您能够构建强大的自动化，同时保持对数据和部署的完全控制。

![n8n.io - Screenshot](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot-readme.png)

## 核心功能

- **需要时编写代码**：编写 JavaScript/Python、添加 npm 包或使用可视化界面
- **原生 AI 平台**：基于 LangChain 构建 AI 代理工作流，使用您自己的数据和模型
- **完全控制**：企业级自托管部署，完全掌控您的数据
- **企业就绪**：高级权限、SSO 和气隙部署
- **活跃社区**：400+ 集成和 900+ 可直接使用的[模板](https://n8n.io/workflows)

## 快速开始

使用 [npx](https://docs.n8n.io/hosting/installation/npm/) 即时试用 n8n（需要 [Node.js](https://nodejs.org/en/)）：

```
npx n8n
```

或使用 [Docker](https://docs.n8n.io/hosting/installation/docker/) 部署：

```
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

在 http://localhost:5678 访问编辑器

## 资源

- 📚 [文档](https://docs.n8n.io)
- 🔧 [400+ 集成](https://n8n.io/integrations)
- 💡 [示例工作流](https://n8n.io/workflows)
- 🤖 [AI 和 LangChain 指南](https://docs.n8n.io/advanced-ai/)
- 👥 [社区论坛](https://community.n8n.io)
- 📖 [社区教程](https://community.n8n.io/c/tutorials/28)

## 支持

需要帮助？请查看我们的文档或联系支持团队。

## n8n 是什么意思？

**简短回答：** 它意思是"nodemation"，发音为 n-eight-n。

**详细回答：** "我经常被问到这个问题（比我预期的更频繁），所以我认为最好在这里回答。当我寻找一个好名字和免费域名时，我很快就意识到我能想到的所有好名字都已经被占用了。所以最后，我选择了 nodemation。'node-' 指的是它使用节点视图并且使用 Node.js，'-mation' 来自 'automation'，这是这个项目应该帮助实现的。然而，我不喜欢这个名字有多长，也无法想象每次在 CLI 中写这么长的名字。那时我就最终选择了 'n8n'。" - **Jan Oberhauser，创始人兼 CEO，n8n.io**
