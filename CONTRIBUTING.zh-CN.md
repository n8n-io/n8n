# 为 n8n 做贡献

很高兴您能来到这里并希望为 n8n 做出贡献

## 目录

- [为 n8n 做贡献](#为-n8n-做贡献)
	- [目录](#目录)
	- [行为准则](#行为准则)
	- [目录结构](#目录结构)
	- [开发设置](#开发设置)
		- [开发容器](#开发容器)
		- [要求](#要求)
			- [Node.js](#nodejs)
			- [pnpm](#pnpm)
				- [pnpm 工作区](#pnpm-工作区)
			- [corepack](#corepack)
			- [构建工具](#构建工具)
		- [实际的 n8n 设置](#实际的-n8n-设置)
		- [启动](#启动)
	- [开发周期](#开发周期)
		- [社区 PR 指南](#社区-pr-指南)
			- [**1. 变更请求/评论**](#1-变更请求评论)
			- [**2. 通用要求**](#2-通用要求)
			- [**3. PR 特定要求**](#3-pr-特定要求)
			- [**4. 不合规 PR 的工作流摘要**](#4-不合规-pr-的工作流摘要)
		- [测试套件](#测试套件)
			- [单元测试](#单元测试)
			- [代码覆盖率](#代码覆盖率)
			- [端到端测试](#端到端测试)
	- [发布](#发布)
	- [创建自定义节点](#创建自定义节点)
	- [扩展文档](#扩展文档)
	- [贡献工作流模板](#贡献工作流模板)
	- [贡献者许可协议](#贡献者许可协议)

## 行为准则

本项目及其所有参与者均受 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 文件中的行为准则约束。
通过参与，您应遵守此准则。请将不可接受的行为报告给 jan@n8n.io。

## 目录结构

n8n 分为不同的模块，所有模块都在一个单一的 mono 仓库中。

最重要的目录：

- [/docker/images](/docker/images) - 用于创建 n8n 容器的 Dockerfile
- [/packages](/packages) - 不同的 n8n 模块
- [/packages/cli](/packages/cli) - 用于运行前端和后端的 CLI 代码
- [/packages/core](/packages/core) - 处理工作流执行、活动 webhook 和工作流的核心代码。**在对此处进行任何更改之前，请联系 n8n**
- [/packages/frontend/@n8n/design-system](/packages/design-system) - Vue 前端组件
- [/packages/frontend/editor-ui](/packages/editor-ui) - Vue 前端工作流编辑器
- [/packages/node-dev](/packages/node-dev) - 用于创建新 n8n 节点的 CLI
- [/packages/nodes-base](/packages/nodes-base) - 基础 n8n 节点
- [/packages/workflow](/packages/workflow) - 前端和后端使用的带接口的工作流代码

## 开发设置

如果您想更改或扩展 n8n，您必须确保安装了所有必需的依赖项，并且包已正确链接。以下是有关如何完成此操作的简要指南：

### 开发容器

如果您已经安装了 VS Code 和 Docker，您可以点击[此处](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/n8n-io/n8n)开始。点击这些链接将导致 VS Code 在需要时自动安装 Dev Containers 扩展，将源代码克隆到容器卷中，并启动一个开发容器以供使用。

### 要求

#### Node.js

开发需要 [Node.js](https://nodejs.org/en/) 22.16 或更高版本。

#### pnpm

开发需要 [pnpm](https://pnpm.io/) 10.2 或更高版本。我们建议使用 [corepack](#corepack) 安装它。

##### pnpm 工作区

n8n 分为不同的模块，所有模块都在一个单一的 mono 仓库中。
为了方便模块管理，使用了 [pnpm 工作区](https://pnpm.io/workspaces)。
这会自动在相互依赖的模块之间设置文件链接。

#### corepack

我们建议使用 `corepack enable` 启用 [Node.js corepack](https://nodejs.org/docs/latest-v16.x/api/corepack.html)。

您可以使用 `corepack prepare --activate` 安装正确版本的 pnpm。

**重要提示**：如果您通过 homebrew 安装了 Node.js，则需要运行 `brew install corepack`，因为 homebrew 从 [`node` 公式](https://github.com/Homebrew/homebrew-core/blob/master/Formula/node.rb#L66)中明确删除了 `npm` 和 `corepack`。

**重要提示**：如果您在 Windows 上，则需要在管理员终端中运行 `corepack enable` 和 `corepack prepare --activate`。

#### 构建工具

n8n 使用的包依赖于一些构建工具：

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

无需其他包。

### 实际的 n8n 设置

> **重要提示**：必须至少执行一次以下所有步骤才能使开发设置正常运行！

现在 n8n 运行所需的一切都已安装，可以检出并设置实际的 n8n 代码：

1. [Fork](https://guides.github.com/activities/forking/#fork) n8n 仓库。

2. 克隆您 fork 的仓库：

   ```
   git clone https://github.com/<your_github_username>/n8n.git
   ```

3. 进入仓库文件夹：

   ```
   cd n8n
   ```

4. 将原始 n8n 仓库添加为 fork 仓库的 `upstream`：

   ```
   git remote add upstream https://github.com/n8n-io/n8n.git
   ```

5. 安装所有模块的所有依赖项并将它们链接在一起：

   ```
   pnpm install
   ```

6. 构建所有代码：
   ```
   pnpm build
   ```

### 启动

要启动 n8n，请执行：

```
pnpm start
```

要使用隧道启动 n8n：

```
./packages/cli/bin/n8n start --tunnel
```

## 开发周期

在迭代 n8n 模块代码时，您可以运行 `pnpm dev`。然后，它将在您每次进行更改时自动构建您的代码、重新启动后端并刷新前端（editor-ui）。

1. 以开发模式启动 n8n：
   ```
   pnpm dev
   ```
2. 编码、编码、编码
3. 检查在生产模式下一切是否仍然正常运行：
   ```
   pnpm build
   pnpm start
   ```
4. 创建测试
5. 运行所有[测试](#测试套件)：
   ```
   pnpm test
   ```
6. 提交代码并[创建拉取请求](https://docs.github.com/en/github/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork)

---

### 社区 PR 指南

#### **1. 变更请求/评论**

请在 14 天内处理请求的更改或提供反馈。如果在此期间没有响应或更新拉取请求，它将被自动关闭。一旦应用了请求的更改，就可以重新打开 PR。

#### **2. 通用要求**

- **遵循风格指南：**
  - 确保您的代码符合 n8n 的编码标准和约定（例如，格式、命名、缩进）。在适用的情况下使用 linting 工具。
- **TypeScript 合规性：**
  - 不要使用 `ts-ignore`。
  - 确保代码符合 TypeScript 规则。
- **避免重复代码：**
  - 尽可能重用现有的组件、参数和逻辑，而不是重新定义或复制它们。
  - 对于节点：在多个操作中使用相同的参数，而不是为每个操作定义一个新参数（如果适用）。
- **测试要求：**
  - PR **必须包含测试**：
    - 单元测试
    - 节点的工作流测试（示例[此处](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Switch/V3/test)）
    - UI 测试（如果适用）
- **拼写错误：**
  - 使用拼写检查工具，例如 [**Code Spell Checker**](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)，以避免拼写错误。

#### **3. PR 特定要求**

- **仅限小型 PR：**
  - 每个 PR 只关注一个功能或修复。
- **命名约定：**
  - 遵循 [n8n 的 PR 标题约定](https://github.com/n8n-io/n8n/blob/master/.github/pull_request_title_conventions.md#L36)。
- **新节点：**
  - 引入新节点的 PR 将被**自动关闭**，除非它们是由 n8n 团队明确请求并与商定的项目范围保持一致。但是，您仍然可以探索[构建自己的节点](https://docs.n8n.io/integrations/creating-nodes/)，因为 n8n 提供了创建自己的自定义节点的灵活性。
- **仅拼写错误的 PR：**
  - 拼写错误不足以成为 PR 的理由，将被拒绝。

#### **4. 不合规 PR 的工作流摘要**

- **无测试：** 如果未提供测试，PR 将在 **14 天**后自动关闭。
- **非小型 PR：** 大型或多方面的 PR 将被退回进行分段。
- **新节点/拼写错误 PR：** 如果与项目范围或指南不符，将自动拒绝。

---

### 测试套件

#### 单元测试

可以通过以下方式启动单元测试：

```
pnpm test
```

如果在一个包文件夹中执行该命令，它将只运行该包的测试。如果在 n8n-root 文件夹中执行，它将运行所有包的所有测试。

如果您进行了需要更新 `.test.ts.snap` 文件的更改，请将 `-u` 传递给命令以运行测试，或在监视模式下按 `u`。

#### 代码覆盖率
我们在 [Codecov](https://app.codecov.io/gh/n8n-io/n8n) 上跟踪我们所有代码的覆盖率。
但是，当您在本地进行测试时，我们建议您在运行测试时将环境变量 `COVERAGE_ENABLED` 设置为 `true`。然后，您可以在 `coverage` 文件夹中查看代码覆盖率，或者您可以使用[此 VSCode 扩展](https://marketplace.visualstudio.com/items?itemName=ryanluker.vscode-coverage-gutters)直接在 VSCode 中可视化覆盖率。

#### 端到端测试

⚠️ 在第一次运行测试和更新 cypress 之前，您必须运行 `pnpm cypress:install` 来安装 cypress。

可以通过以下命令之一启动端到端测试：

- `pnpm test:e2e:ui`：启动 n8n 并使用构建的 UI 代码以交互方式运行端到端测试。不响应代码更改（即运行 `pnpm start` 和 `cypress open`）
- `pnpm test:e2e:dev`：以开发模式启动 n8n 并以交互方式运行端到端测试。响应代码更改（即运行 `pnpm dev` 和 `cypress open`）
- `pnpm test:e2e:all`：启动 n8n 并以无头模式运行端到端测试（即运行 `pnpm start` 和 `cypress run --headless`）

⚠️ 请记住先停止您的开发服务器。否则端口绑定将失败。

## 发布

要开始发布，请使用 SemVer 发布类型触发[此工作流](https://github.com/n8n-io/n8n/actions/workflows/release-create-pr.yml)，并选择要从此版本创建的分支。然后，此工作流将：

1. 提升已更改或其依赖项已更改的包的版本
2. 更新变更日志
3. 创建一个名为 `release/${VERSION}` 的新分支，以及
4. 创建一个新的拉取请求以跟踪需要包含在此版本中的任何进一步更改

准备好发布后，只需合并拉取请求即可。
这将触发[另一个工作流](https://github.com/n8n-io/n8n/actions/workflows/release-publish.yml)，该工作流将：

1. 构建并发布此版本中具有新版本的包
2. 从压缩的发布提交中创建一个新标签和 GitHub 版本
3. 将压缩的发布提交合并回 `master`

## 创建自定义节点

了解有关[构建节点](https://docs.n8n.io/integrations/creating-nodes/)以创建 n8n 的自定义节点的信息。您可以创建社区节点并使用 [npm](https://www.npmjs.com/) 使其可用。

## 扩展文档

n8n 文档的仓库位于 [docs.n8n.io](https://docs.n8n.io)，可以在[此处](https://github.com/n8n-io/n8n-docs)找到。

## 贡献工作流模板

您可以将您的工作流提交到 n8n 的模板库。

n8n 正在开发一个创作者计划，并开发一个模板市场。这是一个正在进行的项目，细节可能会发生变化。

有关如何提交模板和成为创作者的信息，请参阅 [n8n 创作者中心](https://www.notion.so/n8n/n8n-Creator-hub-7bd2cbe0fce0449198ecb23ff4a2f76f)。

## 贡献者许可协议

为了我们以后没有任何潜在问题，遗憾的是有必要签署一份[贡献者许可协议](CONTRIBUTOR_LICENSE_AGREEMENT.md)。这可以通过按一下按钮来完成。

我们使用了现有的最简单的一个。它来自 [Indie Open Source](https://indieopensource.com/forms/cla)，使用通俗易懂的英语，只有几行长。

一旦打开拉取请求，一个自动机器人将立即发表评论，要求签署协议。只有在获得签名后才能合并拉取请求。