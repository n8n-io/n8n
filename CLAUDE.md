# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在处理 n8n 代码仓库中的代码时提供指导。

## 项目概述

n8n 是一个用 TypeScript 编写的 工作流自动化平台，使用由 pnpm 工作空间管理的单仓库结构。它由 Node.js 后端、Vue.js 前端和可扩展的基于节点的工作流引擎组成。

## 一般准则

- 始终使用 pnpm
- 我们使用 Linear 作为工单跟踪系统
- 我们使用 Posthog 进行功能标志
- 开始处理新工单时 - 从最新的 master 创建新分支，使用 Linear 工单中指定的名称
- 为 Linear 中的工单创建新分支时 - 使用 linear 建议的分支名称
- 当需要可视化某些内容时，在 MD 文件中使用 mermaid 图表

## 必要命令

### 构建
使用 `pnpm build` 构建所有包。始终将构建命令的输出重定向到文件：

```bash
pnpm build > build.log 2>&1
```

您可以检查构建日志文件的最后几行以查看错误：
```bash
tail -n 20 build.log
```

### 测试
- `pnpm test` - 运行所有测试
- `pnpm test:affected` - 基于上次提交以来的更改运行测试

运行特定测试文件需要进入该测试的目录并运行：`pnpm test <test-file>`。

在切换目录时，使用 `pushd` 导航到目录，`popd` 返回上一个目录。如果有疑问，使用 `pwd` 检查当前目录。

### 代码质量
- `pnpm lint` - 代码检查
- `pnpm typecheck` - 运行类型检查

在提交代码之前始终运行 lint 和 typecheck 以确保质量。从您正在处理的特定包目录内执行这些命令（例如，`cd packages/cli && pnpm lint`）。仅在准备最终 PR 时运行完整仓库检查。当您的更改影响类型定义、`@n8n/api-types` 中的接口或跨包依赖时，在运行 lint 和 typecheck 之前构建系统。

## 架构概述

**单仓库结构：** pnpm 工作空间和 Turbo 构建编排

### 包结构

单仓库组织为这些关键包：

- **`packages/@n8n/api-types`**：前端和后端之间共享的 TypeScript 接口
- **`packages/workflow`**：核心工作流接口和类型
- **`packages/core`**：工作流执行引擎
- **`packages/cli`**：Express 服务器、REST API 和 CLI 命令
- **`packages/editor-ui`**：Vue 3 前端应用程序
- **`packages/@n8n/i18n`**：UI 文本的国际化
- **`packages/nodes-base`**：集成的内置节点
- **`packages/@n8n/nodes-langchain`**：AI/LangChain 节点
- **`@n8n/design-system`**：用于 UI 一致性的 Vue 组件库
- **`@n8n/config`**：集中式配置管理

## 技术栈

- **前端：** Vue 3 + TypeScript + Vite + Pinia + Storybook UI 库
- **后端：** Node.js + TypeScript + Express + TypeORM
- **测试：** Jest（单元）+ Playwright（E2E）
- **数据库：** TypeORM 支持 SQLite/PostgreSQL/MySQL
- **代码质量：** Biome（用于格式化）+ ESLint + lefthook git hooks

### 关键架构模式

1. **依赖注入**：使用 `@n8n/di` 作为 IoC 容器
2. **控制器-服务-仓库**：后端遵循类似 MVC 的模式
3. **事件驱动**：内部事件总线用于解耦通信
4. **基于上下文的执行**：不同节点类型使用不同上下文
5. **状态管理**：前端使用 Pinia stores
6. **设计系统**：可重用组件和设计令牌集中在
   `@n8n/design-system` 中，所有纯 Vue 组件都应放置在这里
   确保一致性和可重用性

## 关键开发模式

- 每个包都有独立的构建配置，可以独立开发
- 开发期间热重载在整个堆栈中工作
- 节点开发使用专用的 `node-dev` CLI 工具
- 工作流测试基于 JSON 用于集成测试
- AI 功能有专用的开发工作流（`pnpm dev:ai`）

### TypeScript 最佳实践
- **切勿使用 `any` 类型** - 使用适当的类型或 `unknown`
- **避免使用 `as` 进行类型转换** - 使用类型守卫或类型谓词代替
- **在 `@n8n/api-types` 包中定义共享接口** 用于 FE/BE 通信

### 错误处理
- 不要在 CLI 和节点中使用 `ApplicationError` 类抛出错误，
  因为它已被弃用。相反使用 `UnexpectedError`、`OperationalError` 或
  `UserError`。
- 从每个包中的适当错误类导入

### 前端开发
- **所有 UI 文本必须使用 i18n** - 将翻译添加到 `@n8n/i18n` 包
- **直接使用 CSS 变量** - 永远不要硬编码为 px 值的间距
- **data-test-id 必须是单个值**（无空格或多个值）

在实现 CSS 时，参考 @packages/frontend/CLAUDE.md 获取 CSS 变量和样式约定指南。

### 测试指南
- **运行测试时始终从包目录内工作**
- **在单元测试中模拟所有外部依赖**
- **编写单元测试前与用户确认测试用例**
- **提交前类型检查至关重要** - 始终运行 `pnpm typecheck`
- **修改 pinia stores 时**，检查未使用的计算属性

我们用于测试和编写测试的内容：
- 对于测试节点和其他后端组件，我们使用 Jest 进行单元测试。示例可以在 `packages/nodes-base/nodes/**/*test*` 中找到。
- 我们使用 `nock` 进行服务器模拟
- 前端我们使用 `vitest`
- 对于 E2E 测试，我们使用 Playwright。使用 `pnpm --filter=n8n-playwright test:local` 运行。
  详细信息请参见 `packages/testing/playwright/README.md`。

### 常见开发任务

实现功能时：
1. 在 `packages/@n8n/api-types` 中定义 API 类型
2. 在 `packages/cli` 模块中实现后端逻辑，遵循
   `@packages/cli/scripts/backend-module/backend-module.guide.md`
3. 通过控制器添加 API 端点
4. 在 `packages/editor-ui` 中更新前端，添加 i18n 支持
5. 编写带有适当模拟的测试
6. 运行 `pnpm typecheck` 验证类型

## Github 指南
- 创建 PR 时，使用
  `.github/pull_request_template.md` 和
  `.github/pull_request_title_conventions.md` 中的约定。
- 使用 `gh pr create --draft` 创建草稿 PR。
- 在 PR 描述中始终引用 Linear 工单，
  使用 `https://linear.app/n8n/issue/[TICKET-ID]`
- 如果在线性工单中提到，始终链接到 github 问题。
