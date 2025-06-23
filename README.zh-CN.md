![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n - 面向技术团队的安全工作流自动化平台

n8n 是一个工作流自动化平台，它为技术团队提供了代码的灵活性和无代码的速度。凭借 400 多个集成、原生的 AI 功能和公平代码许可证，n8n 让您能够构建强大的自动化流程，同时保持对数据和部署的完全控制。

![n8n.io - Screenshot](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot-readme.png)

## 主要功能

- **需要时可编码**：编写 JavaScript/Python、添加 npm 包或使用可视化界面
- **AI 原生平台**：使用您自己的数据和模型构建基于 LangChain 的 AI 代理工作流
- **完全控制**：使用我们的公平代码许可证进行自托管，或使用我们的[云服务](https://app.n8n.cloud/login)
- **企业就绪**：高级权限、SSO 和气隙部署
- **活跃的社区**：400 多个集成和 900 多个即用型[模板](https://n8n.io/workflows)

## 快速入门

使用 [npx](https://docs.n8n.io/hosting/installation/npm/) 立即试用 n8n（需要 [Node.js](https://nodejs.org/en/)）：

```
npx n8n
```

或使用 [Docker](https://docs.n8n.io/hosting/installation/docker/) 进行部署：

```
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

在 http://localhost:5678 访问编辑器

## 资源

- 📚 [文档](https://docs.n8n.io)
- 🔧 [400 多个集成](https://n8n.io/integrations)
- 💡 [示例工作流](https://n8n.io/workflows)
- 🤖 [AI & LangChain 指南](https://docs.n8n.io/langchain/)
- 👥 [社区论坛](https://community.n8n.io)
- 📖 [社区教程](https://community.n8n.io/c/tutorials/28)

## 支持

需要帮助吗？我们的社区论坛是获取支持和与其他用户联系的地方：
[community.n8n.io](https://community.n8n.io)

## 许可证

n8n 是在 [Sustainable Use License](https://github.com/n8n-io/n8n/blob/master/LICENSE.md) 和 [n8n Enterprise License](https://github.com/n8n-io/n8n/blob/master/LICENSE_EE.md) 下分发的[公平代码](https://faircode.io)。

- **源代码可用**：始终可见的源代码
- **可自托管**：可部署在任何地方
- **可扩展**：添加您自己的节点和功能

[企业许可证](mailto:license@n8n.io) 可用于获取附加功能和支持。

有关许可证模型的更多信息，请参阅[文档](https://docs.n8n.io/reference/license/)。

## 贡献

发现了一个 bug 🐛 或有一个功能想法 ✨？请查看我们的[贡献指南](https://github.com/n8n-io/n8n/blob/master/CONTRIBUTING.md)以开始。

## 加入我们

想要塑造自动化的未来吗？查看我们的[招聘信息](https://n8n.io/careers)并加入我们的团队！

## n8n 是什么意思？

**简短回答：** 它的意思是“nodemation”，发音为 n-eight-n。

**详细回答：** “我经常被问到这个问题（比我预期的要多），所以我决定最好在这里回答。在为这个项目寻找一个好名字和一个免费域名时，我很快意识到我能想到的所有好名字都已经被占用了。所以，最后，我选择了 nodemation。'node-' 的意思是它使用节点视图并且它使用 Node.js，'-mation' 代表'自动化'，这是该项目旨在帮助解决的问题。但是，我不喜欢这个名字那么长，我无法想象每次在 CLI 中都写那么长的东西。就在那时，我最终选择了'n8n'。” - **Jan Oberhauser，n8n.io 创始人兼首席执行官**