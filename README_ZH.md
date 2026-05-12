![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n - 面向技术团队的安全工作流自动化平台

n8n 是一个工作流自动化平台，为技术团队提供代码的灵活性与无代码的速度。凭借 400+ 集成、原生 AI 能力和公平代码许可证，n8n 让您构建强大的自动化流程，同时完全掌控您的数据和部署方式。

![n8n.io - 截图](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot-readme.png)

## 核心能力

- **按需编写代码**：编写 JavaScript/Python、添加 npm 包，或使用可视化界面
- **原生 AI 平台**：基于 LangChain 构建 AI 代理工作流，结合您自己的数据和模型
- **完全掌控**：使用公平代码许可证自行托管，或使用我们的[云服务](https://app.n8n.cloud/login)
- **企业就绪**：高级权限管理、SSO 单点登录和离线部署
- **活跃社区**：400+ 集成和 900+ 即用型[工作流模板](https://n8n.io/workflows)

## 快速开始

使用 [npx](https://docs.n8n.io/hosting/installation/npm/) 即刻体验 n8n（需要 [Node.js](https://nodejs.org/en/)）：

```
npx n8n
```

或使用 [Docker](https://docs.n8n.io/hosting/installation/docker/) 部署：

```
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

访问编辑器：http://localhost:5678

## 资源

- 📚 [官方文档](https://docs.n8n.io)
- 🔧 [400+ 集成](https://n8n.io/integrations)
- 💡 [示例工作流](https://n8n.io/workflows)
- 🤖 [AI 与 LangChain 指南](https://docs.n8n.io/advanced-ai/)
- 👥 [社区论坛](https://community.n8n.io)
- 📖 [社区教程](https://community.n8n.io/c/tutorials/28)

## 获取帮助

需要帮助？我们的社区论坛是获取支持和与其他用户交流的最佳场所：
[community.n8n.io](https://community.n8n.io)

## 许可证

n8n 基于 [fair-code](https://faircode.io) 理念，采用[可持续使用许可证](https://github.com/n8n-io/n8n/blob/master/LICENSE.md)和 [n8n 企业许可证](https://github.com/n8n-io/n8n/blob/master/LICENSE_EE.md)发布。

- **源码可见**：代码始终公开透明
- **可自行托管**：部署到任何地方
- **可扩展**：添加自定义节点和功能

如需更多功能和支持，请联系[企业许可证](mailto:license@n8n.io)。

关于许可证模式的更多信息，请参阅[文档](https://docs.n8n.io/sustainable-use-license/)。

## 参与贡献

发现了 Bug 🐛 或有功能建议 ✨？请查看我们的[贡献指南](https://github.com/n8n-io/n8n/blob/master/CONTRIBUTING.md)，了解环境搭建指南和最佳实践。

## 加入团队

想要塑造自动化的未来？查看我们的[职位列表](https://n8n.io/careers)，加入我们的团队！

## n8n 是什么意思？

**简短回答：** 它代表 "nodemation"，发音为 n-eight-n。

**详细解释：** "我经常被问到这个问题（比预期的要多），所以我决定在这里回答一下。在为项目寻找一个好名字并检查域名可用性时，我很快意识到我能想到的所有好名字都已经被占用了。所以最终我选择了 nodemation。'node-' 一方面指它使用 Node 视图，另一方面指它基于 Node.js；'-mation' 则代表 'automation'（自动化），这正是这个项目要实现的目标。但是，我不喜欢这个名字太长，也想象不到每次在命令行中都要输入那么长的名字。于是最终我选择了 'n8n'。" —— **Jan Oberhauser，n8n.io 创始人兼 CEO**
