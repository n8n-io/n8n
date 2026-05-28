![横幅图片](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n - 面向技术团队的安全工作流自动化

n8n 是一个工作流自动化平台，为技术团队提供代码的灵活性和无代码的速度。拥有 400+ 集成、原生 AI 能力和 fair-code 许可证，n8n 让你能够构建强大的自动化，同时保持对数据和部署的完全控制。

![n8n.io - 截图](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot-readme.png)

## 核心能力

- **按需编写代码**：编写 JavaScript/Python，添加 npm 包，或使用可视化界面
- **AI 原生平台**：基于 LangChain 构建 AI agent 工作流，使用你自己的数据和模型
- **完全控制**：使用我们的 fair-code 许可证自行托管，或使用我们的[云服务](https://app.n8n.cloud/login)
- **企业就绪**：高级权限管理、SSO 和气隙部署
- **活跃社区**：400+ 集成和 900+ 即用型[模板](https://n8n.io/workflows)

## 快速开始

使用 [npx](https://docs.n8n.io/hosting/installation/npm/) 即时体验 n8n（需要 [Node.js](https://nodejs.org/en/)）：

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
- 🤖 [AI 与 LangChain 指南](https://docs.n8n.io/advanced-ai/)
- 👥 [社区论坛](https://community.n8n.io)
- 📖 [社区教程](https://community.n8n.io/c/tutorials/28)

## 支持

需要帮助？我们的社区论坛是获取支持和与其他用户交流的地方：
[community.n8n.io](https://community.n8n.io)

## 许可证

n8n 是 [fair-code](https://faircode.io) 项目，基于[可持续使用许可证](https://github.com/n8n-io/n8n/blob/master/LICENSE.md)和 [n8n 企业许可证](https://github.com/n8n-io/n8n/blob/master/LICENSE_EE.md)分发。

- **源代码可见**：源代码始终可见
- **可自行托管**：可部署在任何地方
- **可扩展**：添加你自己的节点和功能

[企业许可证](mailto:license@n8n.io)提供额外功能和支持。

有关许可证模式的更多信息，请参阅[文档](https://docs.n8n.io/sustainable-use-license/)。

## 贡献

发现了 bug 🐛 或有功能想法 ✨？查看我们的[贡献指南](https://github.com/n8n-io/n8n/blob/master/CONTRIBUTING.md)了解设置步骤和最佳实践。

## 加入团队

想要塑造自动化的未来？查看我们的[招聘信息](https://n8n.io/careers)并加入我们的团队！

## n8n 是什么意思？

**简短回答：** 它代表 "nodemation"，发音为 n-eight-n。

**详细回答：** "我经常被问到这个问题（比我想象的更频繁），所以我决定最好在这里回答。在为一个拥有免费域名的项目寻找好名字时，我很快意识到所有我能想到的好名字都已经被占用了。所以最后，我选择了 nodemation。'node-' 的意思是它使用 Node-View 并且使用 Node.js，'-mation' 代表 'automation'（自动化），这正是这个项目要帮助实现的。然而，我不喜欢这个名字太长，而且我无法想象每次在 CLI 中都要输入那么长的东西。于是就有了 'n8n'。" - **Jan Oberhauser，n8n.io 创始人兼 CEO**
