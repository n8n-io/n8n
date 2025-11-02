# 为 n8n 做贡献

很高兴您想为 n8n 做贡献

## 目录

- [为 n8n 做贡献](#为-n8n-做贡献)
  - [目录](#目录)
  - [行为准则](#行为准则)
  - [目录结构](#目录结构)
  - [开发环境设置](#开发环境设置)
    - [开发容器](#开发容器)
    - [环境要求](#环境要求)
      - [Node.js](#nodejs)
      - [pnpm](#pnpm)
        - [pnpm 工作空间](#pnpm-工作空间)
      - [corepack](#corepack)
      - [构建工具](#构建工具)
    - [实际 n8n 设置](#实际-n8n-设置)
    - [启动](#启动)
  - [开发周期](#开发周期)
    - [社区 PR 指南](#社区-pr-指南)
      - [**1. 变更请求/评论**](#1-变更请求评论)
      - [**2. 一般要求**](#2-一般要求)
      - [**3. PR 特定要求**](#3-pr-特定要求)
      - [**4. 不合规 PR 的工作流程摘要**](#4-不合规-pr-的工作流程摘要)
    - [测试套件](#测试套件)
      - [单元测试](#单元测试)
      - [代码覆盖率](#代码覆盖率)
      - [E2E 测试](#e2e-测试)
  - [发布](#发布)
  - [创建自定义节点](#创建自定义节点)
  - [扩展文档](#扩展文档)
  - [贡献工作流模板](#贡献工作流模板)
  - [贡献者许可协议](#贡献者许可协议)

## 行为准则

本项目和参与其中的每个人均受 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 文件中行为准则的约束。
参与其中，您需要遵守此准则。请将不当行为报告给 jan@n8n.io。

## 目录结构

n8n 分为不同的模块，全部位于一个单一代码库中。

最重要的目录：

- [/docker/images](/docker/images) - 创建 n8n 容器的 Dockerfile
- [/packages](/packages) - 不同的 n8n 模块
- [/packages/cli](/packages/cli) - 运行前端和后端的 CLI 代码
- [/packages/core](/packages/core) - 处理工作流执行、活动 webhook 和工作流的核心代码
  **在开始任何更改前请联系 n8n**
- [/packages/frontend/@n8n/design-system](/packages/design-system) - Vue 前端组件
- [/packages/frontend/editor-ui](/packages/editor-ui) - Vue 前端工作流编辑器
- [/packages/node-dev](/packages/node-dev) - 创建新 n8n 节点的 CLI
- [/packages/nodes-base](/packages/nodes-base) - 基础 n8n 节点
- [/packages/workflow](/packages/workflow) - 工作流代码及前后端使用的接口

## 开发环境设置

如果您想更改或扩展 n8n，您必须确保安装了所有必需的依赖并且包正确链接。以下是一个简短指南，说明如何完成此操作：

### 开发容器

如果您已经安装了 VS Code 和 Docker，可以点击[此处](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/n8n-io/n8n)开始。点击这些链接将使 VS Code 自动安装 Dev Containers 扩展（如果需要），将源代码克隆到容器卷中，并启动开发容器供使用。

### 环境要求

#### Node.js

开发需要 [Node.js](https://nodejs.org/en/) 版本 22.16 或更高。

#### pnpm

开发需要 [pnpm](https://pnpm.io/) 版本 10.2 或更高版本。我们建议使用 [corepack](#corepack) 安装。

##### pnpm 工作空间

n8n 分为不同的模块，全部位于一个单一代码库中。
为了方便模块管理，使用了 [pnpm 工作空间](https://pnpm.io/workspaces)。
这会自动设置相互依赖的模块之间的文件链接。

#### corepack

我们建议使用 `corepack enable` 启用 [Node.js corepack](https://nodejs.org/docs/latest-v16.x/api/corepack.html)。

您可以使用 `corepack prepare --activate` 安装正确版本的 pnpm。

**重要**：如果您通过 homebrew 安装了 Node.js，您需要运行 `brew install corepack`，因为 homebrew 明确从 [`node` 公式](https://github.com/Homebrew/homebrew-core/blob/master/Formula/node.rb#L66) 中移除了 `npm` 和 `corepack`。

**重要**：如果您在 Windows 上，您需要以管理员身份在终端中运行 `corepack enable` 和 `corepack prepare --activate`。

#### 构建工具

n8n 使用的包依赖于几个构建工具：

Debian/Ubuntu：

```
apt-get install -y build-essential python
```

CentOS：

```
yum install gcc gcc-c++ make
```

Windows：

```
npm add -g windows-build-tools
```

MacOS：

无需额外包。

#### actionlint（用于 GitHub Actions 工作流开发）

如果您计划修改 GitHub Actions 工作流文件（`.github/workflows/*.yml`），您需要 [actionlint](https://github.com/rhysd/actionlint) 进行工作流验证：

**macOS (Homebrew):**
```
brew install actionlint
```
> **注意**：actionlint 仅在修改工作流文件时需要。当工作流文件更改时，它通过 git hooks 自动运行。

### 实际 n8n 设置

> **重要**：以下所有步骤至少需要执行一次才能建立和运行开发环境！

现在已安装 n8n 运行所需的所有内容，可以签出和设置实际的 n8n 代码：

1. [Fork](https://guides.github.com/activities/forking/#fork) n8n 仓库。

2. 克隆您 fork 的仓库：

   ```
   git clone https://github.com/<your_github_username>/n8n.git
   ```

3. 进入仓库文件夹：

   ```
   cd n8n
   ```

4. 将原始 n8n 仓库添加为您 fork 仓库的 `upstream`：

   ```
   git remote add upstream https://github.com/n8n-io/n8n.git
   ```

5. 安装所有模块的依赖并将它们链接在一起：

   ```
   pnpm install
   ```

6. 构建所有代码：
   ```
   pnpm build
   ```

### 启动

要启动 n8n，执行：

```
pnpm start
```

使用隧道启动 n8n：

```
./packages/cli/bin/n8n start --tunnel
```

## 开发周期

在迭代 n8n 模块代码时，您可以运行 `pnpm dev`。它将自动构建您的代码，在您每次进行更改时重启后端并刷新前端（editor-ui）。

### 基本开发工作流程

1. 在开发模式下启动 n8n：
   ```
   pnpm dev
   ```
2. 编码，编码，编码
3. 检查一切是否仍在生产模式下运行：
   ```
   pnpm build
   pnpm start
   ```
4. 创建测试
5. 运行所有[测试](#test-suite)：
   ```
   pnpm test
   ```
6. 提交代码并[创建拉取请求](https://docs.github.com/en/github/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork)

### 节点热重载 (N8N_DEV_RELOAD)

开发自定义节点或凭证时，您可以启用热重载来自动检测更改而无需重启服务器：

```bash
N8N_DEV_RELOAD=true pnpm dev
```

**性能考虑：**
- 文件监视会给系统带来开销，特别是在较慢的机器上
- 监视器监视潜在数千个文件，这可能影响 CPU 和内存使用
- 在资源受限的系统上，考虑不使用热重载进行开发，并在需要时手动重启

### 选择性包开发

在开发模式下运行所有包可能是资源密集型的。为了更好的性能，只运行与您工作相关的包：

#### 可用的过滤命令

- **仅后端开发：**
  ```bash
  pnpm dev:be
  ```
  排除像 editor-ui 和 design-system 这样的前端包

- **仅前端开发：**
  ```bash
  pnpm dev:fe
  ```
  运行后端服务器和 editor-ui 开发服务器

- **AI/LangChain 节点开发：**
  ```bash
  pnpm dev:ai
  ```
  仅运行 AI 节点开发的基本包

#### 自定义选择性开发

为了更有针对性的开发，您可以单独运行包：

**示例 1：处理自定义节点**
```bash
# 终端 1：构建和监视节点包
cd packages/nodes-base
pnpm dev

# 终端 2：运行带有热重载的 CLI
cd packages/cli
N8N_DEV_RELOAD=true pnpm dev
```

**示例 2：纯前端开发**
```bash
# 终端 1：启动后端服务器（不监视）
pnpm start

# 终端 2：运行前端开发服务器
cd packages/editor-ui
pnpm dev
```

**示例 3：处理特定节点包**
```bash
# 终端 1：监视您的节点包
cd packages/nodes-base  # 或您的自定义节点包
pnpm watch

# 终端 2：运行带有热重载的 CLI
cd packages/cli
N8N_DEV_RELOAD=true pnpm dev
```

### 性能考虑

完整开发模式（`pnpm dev`）并行运行多个进程：

1. 每个包的 **TypeScript 编译**
2. 监视源文件的 **文件监视器**
3. 在更改时重启后端的 **Nodemon**
4. 带有 HMR 的前端 **Vite 开发服务器**
5. 各种包的 **多个构建进程**

**性能影响：**
- 可能消耗大量 CPU 和内存资源
- 文件系统监视会产生开销，特别是在：
  - 网络文件系统
  - 带有共享文件夹的虚拟机
  - I/O 性能较慢的系统
- 在开发模式下运行的包越多，消耗的系统资源就越多

**资源受限环境的建议：**
1. 根据任务使用选择性开发命令
2. 关闭不必要的应用程序以释放资源
3. 监控系统性能并相应调整开发方法

---

### 社区 PR 指南

#### **1. 变更请求/评论**

请在 14 天内解决请求的更改或提供反馈。如果在此期间没有响应或更新拉取请求，它将自动关闭。一旦应用了请求的更改，可以重新打开 PR。

#### **2. 一般要求**

- **遵循样式指南：**
  - 确保您的代码遵守 n8n 的编码标准和约定（例如，格式、命名、缩进）。在适用时使用 lint 工具。
- **TypeScript 合规性：**
  - 不要使用 `ts-ignore`。
  - 确保代码遵守 TypeScript 规则。
- **避免重复代码：**
  - 尽可能重用现有组件、参数和逻辑，而不是重新定义或复制它们。
  - 对于节点：在多个操作中使用相同参数，而不是为每个操作定义新参数（如果适用）。
- **测试要求：**
  - PR **必须包含测试**：
    - 单元测试
    - 节点的工作流测试（示例[此处](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Switch/V3/test)）
    - UI 测试（如果适用）
- **拼写错误：**
  - 使用拼写检查工具，例如[**代码拼写检查器**](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)，以避免拼写错误。

#### **3. PR 特定要求**

- **仅小 PR：**
  - 每个 PR 专注于单一功能或修复。
- **命名约定：**
  - 遵循 [n8n 的 PR 标题约定](https://github.com/n8n-io/n8n/blob/master/.github/pull_request_title_conventions.md#L36)。
- **新节点：**
  - 除非由 n8n 团队明确要求并与约定项目范围对齐，否则引入新节点的 PR 将**自动关闭**。但是，您仍然可以探索[构建自己的节点](https://docs.n8n.io/integrations/creating-nodes/overview/)，因为 n8n 提供了创建自己的自定义节点的灵活性。
- **仅拼写错误 PR：**
  - 拼写错误不足以作为 PR 的理由，将被拒绝。

#### **4. 不合规 PR 的工作流程摘要**

- **无测试：**如果未提供测试，PR 将在 **14 天**后自动关闭。
- **非小 PR：**大型或多方面 PR 将被返回进行分段。
- **新节点/拼写错误 PR：**如果不符合项目范围或指导原则，将自动拒绝。

---

### 测试套件

#### 单元测试

单元测试可以通过以下方式启动：

```
pnpm test
```

如果在某个包文件夹中执行，它将仅运行该包的测试。如果在 n8n 根文件夹中执行，它将运行所有包的测试。

如果您进行了需要更新 `.test.ts.snap` 文件的更改，请将 `-u` 传递给测试命令或在监视模式下按 `u`。

#### 代码覆盖率
我们在 [Codecov](https://app.codecov.io/gh/n8n-io/n8n) 上跟踪所有代码的覆盖率。
但当您在本地处理测试时，我们建议使用环境变量 `COVERAGE_ENABLED` 设置为 `true` 来运行测试。然后您可以在 `coverage` 文件夹中查看代码覆盖率，或者使用[此 VSCode 扩展](https://marketplace.visualstudio.com/items?itemName=ryanluker.vscode-coverage-gutters)在 VSCode 中直接可视化覆盖率。

#### E2E 测试

n8n 使用 [Playwright](https://playwright.dev) 进行 E2E 测试。

E2E 测试可以通过以下命令之一启动：

- `pnpm --filter=n8n-playwright test:local` - 本地运行测试（启动端口 5680 上的本地服务器并运行 UI 测试）
- `pnpm --filter=n8n-playwright test:local --ui` - 以交互式 UI 模式运行测试（用于调试）
- `pnpm --filter=n8n-playwright test:local --grep="test-name"` - 运行匹配模式的特定测试

更多测试命令请参见 `packages/testing/playwright/README.md`，编写指南请参见 `packages/testing/playwright/CONTRIBUTING.md`。

## 发布

要开始发布，使用 SemVer 发布类型触发[此工作流](https://github.com/n8n-io/n8n/actions/workflows/release-create-pr.yml)，并选择要从中创建发布的分支。此工作流将：

1. 递增已更改或依赖项已更改的包的版本
2. 更新 Changelog
3. 创建名为 `release/${VERSION}` 的新分支，以及
4. 创建新的拉取请求以跟踪需要包含在此发布中的任何进一步更改

准备发布时，只需合并拉取请求。
这将触发[另一个工作流](https://github.com/n8n-io/n8n/actions/workflows/release-publish.yml)，它将：

1. 构建和发布此发布中有新版本的包
2. 从压缩的发布提交创建新标签和 GitHub 发布
3. 将压缩的发布提交合并回 `master`

## 创建自定义节点

了解[构建节点](https://docs.n8n.io/integrations/creating-nodes/overview/)为 n8n 创建自定义节点。您可以创建社区节点并使用 [npm](https://www.npmjs.com/) 使它们可用。

## 扩展文档

[docs.n8n.io](https://docs.n8n.io) 上的 n8n 文档仓库可以在[此处](https://github.com/n8n-io/n8n-docs)找到。

## 贡献工作流模板

您可以将您的工作流提交到 n8n 的模板库。

n8n 正在开发一个创作者计划，并开发模板市场。这是一个正在进行的项目，详细信息可能会发生变化。

有关如何提交模板并成为创作者的信息，请参考 [n8n 创作者中心](https://www.notion.so/n8n/n8n-Creator-hub-7bd2cbe0fce0449198ecb23ff4a2f76f)。

## 贡献者许可协议

为了我们以后不会有任何潜在问题，很遗憾有必要签署[贡献者许可协议](CONTRIBUTOR_LICENSE_AGREEMENT.md)。这可以通过按下按钮来完成。

我们使用了最简单的。它来自 [Indie Open Source](https://indieopensource.com/forms/cla)，使用简单英语，实际上只有几行。

一旦拉取请求打开，自动化机器人将立即留下评论请求签署协议。只有获得签名后才能合并拉取请求。
