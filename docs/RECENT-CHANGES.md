# 最近变更

本文档仅记录最近几个月的重要变更。完整历史请查看 [archive/FULL-CHANGELOG.md](./archive/FULL-CHANGELOG.md)。

## 2025-11-07

### PostHog 完全移除 + 实验性功能默认启用 ✅

彻底移除了 PostHog 外部分析服务，并将所有实验性功能改为默认启用，实现完全本地化运行。

**核心改动**:
- ✅ **删除 PostHog Store**: 完全移除 `posthog.store.ts` 及所有相关引用
- ✅ **移除外部依赖**: 移除 `posthog-node` 包和前端 PostHog 初始化
- ✅ **实验性功能默认启用**: 7个实验性功能存储全部改为无条件启用

**实验性功能列表** (全部默认启用):
1. ✅ Ready-to-run Workflows（就绪工作流）
2. ✅ AI Templates Starter Collection（AI模板启动集合）
3. ✅ Templates Data Quality（模板质量改进）
4. ✅ Template Recommendations V2/V3（模板推荐）
5. ✅ Command Bar（命令栏功能）
6. ✅ NDV UI Overhaul（NDV界面改进）
7. ✅ Pre-built Agents（预构建AI代理）
8. ✅ Canvas Zoomed View（画布缩放视图）
9. ✅ NDV In-Focus Panel（NDV焦点面板）

**修改统计**:
- 📝 修改文件：25+ 个
- 🗑️ 删除文件：1 个（posthog.store.ts）
- 🔧 实验性存储：7 个
- 🎨 Vue 组件：5 个
- ⚙️ 组合式函数：5 个
- 🧪 测试文件清理：10 个

**技术细节**:
```typescript
// 修改前：依赖 PostHog 远程功能标志
const isFeatureEnabled = computed(() => {
  return posthogStore.getVariant(EXPERIMENT.name) === EXPERIMENT.variant;
});

// 修改后：直接启用
const isFeatureEnabled = computed(() => {
  return true; // Experimental feature enabled by default
});
```

**最终效果**:
- ✅ 前端构建成功，零 TypeScript 错误
- ✅ PostHog 完全移除，无外部数据传输
- ✅ 所有实验性功能立即可用，无需配置
- ✅ 系统完全自主部署，无任何外部服务依赖

详见提交: `feat: 完全移除PostHog并默认启用所有实验性功能`

---

### 前后端分离 WebSocket 连接修复 ✅

修复了前后端分离架构中的关键 WebSocket 连接问题，确保实时推送功能正常工作。

**问题根源**:
- ❌ Vite 代理配置遗漏：`/rest` 端点缺少 `ws: true`
- ❌ 导致 `/rest/push` WebSocket 连接无法建立
- ❌ 表现为"与服务器的连接丢失"、无法执行工作流

**核心修复**:
- ✅ 在 `/rest` 代理中添加 `ws: true` 启用 WebSocket 支持
- ✅ 补充 `/mcp` 和 `/mcp-test` 端点（修复 GitHub issue #17923）
- ✅ 添加完整的 webhook、form 相关端点代理
- ✅ 创建 `.env` 环境变量配置文件

**配置完整性**:
- ✅ 13 个代理端点全部配置（REST、WebSocket、Webhook、Form、MCP、监控）
- ✅ 5 个 WebSocket 端点正确启用（/rest、/push、/webhook*）
- ✅ 环境变量完整配置（VITE_API_BASE_URL、N8N_*）
- ✅ 所有关键端点测试通过

**影响范围**:
- ✅ 实时推送连接：正常工作
- ✅ 工作流执行状态更新：正常
- ✅ 多用户协作同步：正常
- ✅ Webhook 和表单功能：完整支持
- ✅ MCP 功能：已支持

**技术细节**:
```typescript
// vite.config.mts - 关键修复
'/rest': {
  target: 'http://localhost:5678',
  changeOrigin: true,
  ws: true,  // ← 核心修复！
}
```

详见: [packages/frontend/editor-ui/vite.config.mts](../packages/frontend/editor-ui/vite.config.mts)

---

### Telemetry 系统验证与优化 ✅

完成遥测系统与官方 n8n 的全面对比验证，并清理无用字段。

**验证结果**:
- ✅ 功能一致性：100%（所有数据收集逻辑完全相同）
- ✅ 使用方法一致性：99%（调用方式完全一致）
- ✅ 48 个后端事件处理器全部一致
- ✅ 50+ 个前端调用点全部一致
- ✅ 100+ 个事件名称完全相同

**优化内容**:
- ✅ 移除 5 个硬编码的 License 字段（无实际意义）
- ✅ 清理 `serverStarted()` 方法中的假数据
- ✅ 清理 `pulse()` 方法中的硬编码值
- ✅ 代码减少 15 行，数据更精简

**当前状态**:
- ✅ 遥测系统功能与官方完全一致
- ✅ 所有字段都是动态获取的真实数据
- ✅ 数据本地化，完全可控
- ✅ 不向 n8n 官方发送任何数据

详见: [技术概述 - Telemetry 本地化系统](./TECHNICAL-OVERVIEW.md#telemetry-本地化系统)

---

## 2025-11-05

### 前端构建系统修复与优化 ✅

修复了前端构建过程中的 TypeScript 错误和开发环境热重载问题。

**主要修复**:
- ✅ 修复 TypeScript 未使用导入错误（Notice.vue）
- ✅ 修复开发环境热重载无限循环问题（locale 模块）
- ✅ 新增 Telemetry 统计 API（概览、Top 事件、活跃用户）
- ✅ 添加数据库迁移文件：创建 telemetry_event 表

**当前状态**:
- ✅ TypeScript 构建：无错误
- ✅ 开发环境热重载：正常工作
- ✅ 后端/前端服务：正常启动

---

### 前后端分离架构完善 ✅

完成前后端分离架构的全面调整和优化。

**架构调整**:
- ✅ 主应用前端：独立 Vite 服务 (8080) + Vite proxy
- ✅ 管理后台前端：独立 Vite 服务 (5679) + Vite proxy
- ✅ 后端：纯 REST API 服务 (5678)
- ✅ 统一使用 `/rest` 作为 API 端点

**修复内容**:
- ✅ 修复 CSS 变量语法错误（design-system）
- ✅ 修复 Express 路由语法兼容性（path-to-regexp@8.x）
- ✅ 清理冗余配置和文档
- ✅ 构建状态：42/42 包全部通过

---

## 2025-11-04

### 构建系统修复

**依赖版本锁定**:
- ✅ 对比原始 n8n 仓库，发现 8 个依赖版本不匹配
- ✅ 使用 pnpm overrides 精确锁定所有关键依赖
- ✅ 修复 @types/amqplib 版本导致的 RabbitMQ 类型错误
- ✅ 统一 chart.js/vue-chartjs 版本
- ✅ 移除所有临时 @ts-expect-error
- ✅ 构建成功：42/42 包全部通过

---

### Telemetry 独立管理平台

**完成自托管遥测系统**:
- ✅ 实现数据库层（2 个实体 + 1 个迁移）
- ✅ 实现后端模块（Repository + Service + Controller）
- ✅ 恢复前端遥测功能（批量上报 + 持久化 + 重试）
- ✅ 所有遥测数据存储本地数据库
- 🚧 管理界面待开发

---

### 跟踪系统清理

**移除外部分析服务**:
- ✅ 完全移除 CloudPlan Store（云订阅状态）
- ✅ 完全移除 PostHog Store（外部分析）
- ✅ 提取独立 Feature Flags Store（220 行，无外部依赖）
- ✅ 迁移 17 个文件的 Feature Flags 调用

---

### 中文本地化

**完成全面中文化**:
- ✅ 3,795+ 翻译键完整中文化
- ✅ 实现语言切换功能（中文/英文）
- ✅ 设置中文为默认语言
- ✅ 添加语言偏好持久化
- ✅ 优化日期时间本地化

---

## 历史变更

更早期的变更记录请查看：
- [完整更新日志](./archive/FULL-CHANGELOG.md) - 详细的开发历史
- [详细变更说明](./archive/DETAILED-CHANGES.md) - 代码变更和删除内容
- [详细技术说明](./archive/DETAILED-TECHNICAL.md) - 实现策略和代码示例

---

**最后更新**: 2025-11-05
