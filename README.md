![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n - 技术团队的安全工作流自动化平台

n8n 是一个工作流自动化平台，为技术团队提供代码级别的灵活性，同时具备无代码的速度。通过 400+ 集成、原生 AI 能力和企业级功能，n8n 让您能够构建强大的自动化，同时保持对数据和部署的完全控制。

![n8n.io - Screenshot](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot-readme.png)

---

## ⚠️ 二次开发说明

**本仓库为 n8n 的二次开发版本，已移除所有许可证验证系统。**

### 🎯 主要变更

- ✅ **移除许可证验证**: 完全删除所有许可证检查代码（而非绕过）
- ✅ **企业功能解锁**: 所有企业版功能默认启用，无需许可证
- ✅ **无网络验证**: 移除与 license.n8n.io 的所有通信
- ✅ **无限制使用**: 移除团队项目数量、用户数量等配额限制

### 📦 默认启用的企业功能

本版本包含以下开箱即用的企业功能：

**认证与安全**
- LDAP 登录
- SAML SSO
- OIDC SSO
- 高级权限
- 项目角色

**协作与管理**
- 工作流分享
- 无限团队项目
- 环境变量
- 外部密钥

**开发工具**
- Source Control (Git 集成)
- 工作流历史
- AI Assistant
- 高级执行过滤

**分析与监控**
- Insights & Analytics
- 日志流
- Provisioning

**API 功能**
- 完整 Public API
- API 密钥管理

### 📋 技术细节

查看 [`二次开发进度说明.md`](./二次开发进度说明.md) 获取详细的技术文档，包括：
- 完整的修改清单（151 个文件）
- 架构变更说明
- 与原版的差异对比
- 构建和部署指南

### ⚠️ 重要提醒

1. **仅供内部使用** - 本版本仅用于团队内部，不得对外发布或商业使用
2. **自行承担风险** - 使用前请确保符合 n8n 的开源许可证要求
3. **安全加固** - 移除许可证检查后，请自行实现必要的访问控制
4. **更新风险** - 与上游同步时需重新应用所有许可证移除的修改

### 🚀 当前状态

- ✅ **编译成功** - 所有预提交检查通过
- ✅ **代码质量** - TypeScript、Biome、Prettier 检查通过
- ✅ **可运行** - 生产代码可正常启动
- 📝 **文档完整** - 包含详细的技术文档

---

## 核心功能

- **需要时编写代码**：编写 JavaScript/Python、添加 npm 包或使用可视化界面
- **原生 AI 平台**：基于 LangChain 构建 AI 代理工作流，使用您自己的数据和模型
- **完全控制**：企业级自托管部署，完全掌控您的数据
- **企业就绪**：高级权限、SSO 和气隙部署 *(本版本已默认启用)*
- **活跃社区**：400+ 集成和 900+ 可直接使用的[模板](https://n8n.io/workflows)

## 快速开始

### 使用 pnpm（推荐）

```bash
# 安装依赖
pnpm install

# 开发模式启动
pnpm dev

# 生产构建
pnpm build

# 启动生产服务
pnpm start
```

### 使用 Docker

```bash
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

在 http://localhost:5678 访问编辑器

## 资源

- 📚 [官方文档](https://docs.n8n.io)
- 🔧 [400+ 集成](https://n8n.io/integrations)
- 💡 [示例工作流](https://n8n.io/workflows)
- 🤖 [AI 和 LangChain 指南](https://docs.n8n.io/advanced-ai/)
- 👥 [社区论坛](https://community.n8n.io)
- 📖 [社区教程](https://community.n8n.io/c/tutorials/28)

## 开发指南

### 构建命令

```bash
# 完整构建
pnpm build

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 格式化代码
pnpm format
```

### 当前分支

- **分支**: `20251102`
- **最新提交**: 901b241429
- **状态**: ✅ 所有检查通过

## 二次开发维护

### 与上游同步

如需从 n8n 官方仓库同步更新：

```bash
# 添加上游仓库（首次）
git remote add upstream https://github.com/n8n-io/n8n.git

# 获取上游更新
git fetch upstream

# 合并更新（需要重新应用许可证移除）
git merge upstream/master
```

**注意**: 合并后需要重新检查并移除新引入的许可证相关代码。

### 文档维护

重大修改后请更新以下文档：
- `二次开发进度说明.md` - 技术细节和进度追踪
- `README.md` - 本文件，项目概述
- Git 提交信息 - 清晰标注二次开发内容

## 支持

本二次开发版本由内部团队维护。

原版 n8n 的官方支持请访问 [n8n 官网](https://n8n.io)。

## n8n 是什么意思？

**简短回答：** 它意思是"nodemation"，发音为 n-eight-n。

**详细回答：** "我经常被问到这个问题（比我预期的更频繁），所以我认为最好在这里回答。当我寻找一个好名字和免费域名时，我很快就意识到我能想到的所有好名字都已经被占用了。所以最后，我选择了 nodemation。'node-' 指的是它使用节点视图并且使用 Node.js，'-mation' 来自 'automation'，这是这个项目应该帮助实现的。然而，我不喜欢这个名字有多长，也无法想象每次在 CLI 中写这么长的名字。那时我就最终选择了 'n8n'。" - **Jan Oberhauser，创始人兼 CEO，n8n.io**

---

*本版本基于 n8n 开源项目进行二次开发*
*最后更新: 2025-11-03*
