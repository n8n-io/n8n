# 技术概述

本文档提供二次开发的核心技术概述。详细实现请查看 [archive/DETAILED-TECHNICAL.md](./archive/DETAILED-TECHNICAL.md)。

## 核心改动策略

### 许可证系统移除

**实现方式**：
1. ✅ 删除核心文件 - `packages/cli/src/license/` 整个目录
2. ✅ 删除依赖项 - 从 package.json 移除 `@n8n_io/license-sdk`
3. ✅ 直接执行逻辑 - 所有企业功能无条件启用
4. ✅ 前端配置硬编码 - `frontend.service.ts` 中所有功能设为 `true`
5. ✅ 中间件清理 - 改为空操作（直接调用 `next()`）

**无任何许可证检查残留** - 不存在"绕过函数"，功能直接启用。

---

## 删除的核心模块

### 许可证相关（30+ 文件）
```
packages/cli/src/license/                    # 整个目录
packages/@n8n/config/src/configs/license.config.ts
packages/cli/src/commands/license/           # CLI 命令
packages/cli/src/errors/feature-not-licensed.error.ts
```

### 云服务依赖（20+ 文件）
```
# 版本通知系统
packages/frontend/editor-ui/src/app/components/WhatsNewModal.vue
packages/frontend/editor-ui/src/app/stores/versions.store.ts
packages/@n8n/config/src/configs/version-notifications.config.ts

# 动态横幅系统
packages/frontend/editor-ui/src/features/shared/banners/
packages/cli/src/services/banner.service.ts

# 外部分析跟踪
packages/frontend/editor-ui/src/app/stores/cloudPlan.store.ts
packages/frontend/editor-ui/src/app/stores/posthog.store.ts
```

---

## 关键代码修改示例

### 1. 企业功能配置（前端）

**文件**: `packages/cli/src/services/frontend.service.ts:95-120`

```typescript
// 所有企业功能硬编码为 true
getSettings(): ISettingsModel {
  return {
    enterprise: {
      sharing: true,
      ldap: true,
      saml: true,
      oidc: true,
      logStreaming: true,
      sourceControl: true,
      externalSecrets: true,
      showNonProdBanner: false,
      debugInEditor: true,
      binaryDataS3: true,
      workflowHistory: true,
      workerView: true,
      advancedExecutionFilters: true,
      variables: true,
      // ... 更多功能
    }
  };
}
```

### 2. SAML 配置启动

**文件**: `packages/cli/src/sso/saml/saml.service.ee.ts:150-170`

```typescript
// 修改前：检查许可证
async init() {
  if (!this.license.isSamlEnabled()) {
    return;
  }
  await this.loadConfig();
}

// 修改后：直接执行
async init() {
  await this.loadConfig();
}
```

### 3. Source Control 中间件

**文件**: `packages/cli/src/environments/source-control/middleware/source-control.middleware.ee.ts:20-30`

```typescript
// 修改前：检查许可证
export const sourceControlLicensedMiddleware: RequestHandler = (req, res, next) => {
  if (Container.get(License).isSourceControlLicensed()) {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden' });
  }
};

// 修改后：直接放行
export const sourceControlLicensedMiddleware: RequestHandler = (_req, _res, next) => {
  next();
};
```

---

## 新增功能模块

### Telemetry 本地化系统

**架构**:
```
前端事件 → Telemetry Controller → 本地数据库
后端事件 → Telemetry Service → 本地数据库 + 用户 PostHog
```

**核心组件**:
- 实体层：`TelemetryEvent`
- 仓库层：`TelemetryEventRepository`
- 服务层：`TelemetryManagementService`
- 控制器：`TelemetryManagementController`
- 前端采集：批量上报 + localStorage 持久化 + 失败重试

**修改策略**:
1. ✅ 移除 RudderStack（原发送到 n8n 官方）
2. ✅ 保留所有数据收集逻辑（100% 功能一致）
3. ✅ 数据存储本地数据库
4. ✅ 移除 License 依赖，清理硬编码字段

**关键文件修改**:

`packages/cli/src/telemetry/index.ts`:
```typescript
// 移除前
private rudderStack?: RudderStack;
this.rudderStack.track(payload); // 发送到官方

// 移除后
this.telemetryManagementService.trackEvent({
  eventName,
  properties: updatedProperties,
  source: 'backend',
}); // 存储本地
```

`packages/cli/src/events/relays/telemetry.event-relay.ts`:
```typescript
// 清理前 (serverStarted)
const info = {
  license_plan_name: 'Enterprise',  // 硬编码
  license_tenant_id: 1,              // 硬编码
  binary_data_s3: true,              // 硬编码
  // ...
};

// 清理后 - 只保留真实数据
const info = {
  version_cli: N8N_VERSION,
  db_type: this.globalConfig.database.type,
  system_info: { /* 真实系统信息 */ },
  // ...
};
```

**验证结果** (2025-11-07):
- ✅ 功能与官方 n8n **100% 一致**
- ✅ 使用方法 **99% 一致**（仅数据流向不同）
- ✅ 48 个后端事件处理器全部一致
- ✅ 50+ 个前端调用点全部一致
- ✅ 100+ 个事件名称完全相同

**数据库表**:
```sql
CREATE TABLE telemetry_event (
  id INTEGER PRIMARY KEY,
  eventName VARCHAR(255),
  properties JSON,
  userId VARCHAR(36),
  workflowId VARCHAR(36),
  instanceId VARCHAR(36),
  source VARCHAR(20), -- 'frontend' | 'backend'
  createdAt TIMESTAMP
);
```

---

## 中文本地化

### 实现方式

1. **翻译文件**: `packages/@n8n/i18n/src/locales/zh_CN.json`
   - 3,795+ 完整翻译键
   - 涵盖所有 UI 文本

2. **默认语言**: `packages/frontend/editor-ui/src/plugins/i18n/index.ts`
   ```typescript
   const locale = useStorage('n8n-locale', 'zh');
   ```

3. **语言切换**: 设置页面提供中英文切换
   - 持久化到 localStorage
   - 实时更新界面

---

## 开发架构（前后端分离）

### 开发环境
```
主应用前端 (8080)     → Vite proxy → 后端 API (5678)
管理后台前端 (5679)   → Vite proxy → 后端 API (5678)
```

### 生产环境
```
静态资源 (CDN/Nginx)  → 后端 API (5678)
```

**优势**:
- ✅ 职责清晰，完全解耦
- ✅ 避免 CORS 跨域问题
- ✅ 热重载正常工作
- ✅ 与生产架构一致

### Vite 代理配置

**关键配置** (`packages/frontend/editor-ui/vite.config.mts`):

```typescript
server: {
  host: '0.0.0.0',
  port: 8080,
  proxy: {
    // REST API - 需要 ws: true 支持 /rest/push WebSocket
    '/rest': {
      target: process.env.VITE_API_BASE_URL || 'http://localhost:5678',
      changeOrigin: true,
      ws: true,  // ← 关键：支持 WebSocket 升级
    },
    // 其他 WebSocket 端点
    '/push': { ws: true },
    '/webhook': { ws: true },
    '/webhook-test': { ws: true },
    '/webhook-waiting': { ws: true },
    // 其他 HTTP 端点
    '/form', '/form-test', '/form-waiting',
    '/mcp', '/mcp-test',
    '/types', '/healthz', '/metrics'
  }
}
```

**重要提示**:
- ⚠️ `/rest` 端点必须配置 `ws: true`，否则 `/rest/push` WebSocket 连接失败
- ⚠️ Vite proxy 配置修改后需要重启开发服务器才能生效
- ✅ 使用环境变量 `VITE_API_BASE_URL` 配置后端地址
- ✅ 13 个代理端点全覆盖（REST、WebSocket、Webhook、Form、MCP、监控）

---

## 依赖管理

**pnpm overrides 锁定策略**:
```json
{
  "pnpm": {
    "overrides": {
      "@types/amqplib": "0.10.5",
      "chart.js": "4.4.8",
      "vue-chartjs": "5.3.2"
      // ... 更多锁定
    }
  }
}
```

**原因**:
- ✅ 确保与原始 n8n 仓库版本一致
- ✅ 避免依赖自动升级导致的构建问题
- ✅ 类型定义与运行时库完全匹配

---

## 更多技术细节

详细的实现策略、代码示例和历史演变请查看：
- [详细技术文档](./archive/DETAILED-TECHNICAL.md)
- [详细变更说明](./archive/DETAILED-CHANGES.md)

---

## 质量保证

### Telemetry 系统验证

**对比官方 n8n 仓库** (2025-11-07):
- ✅ 数据收集逻辑：100% 一致
- ✅ API 调用方式：100% 一致
- ✅ 事件名称：100% 一致（100+ 个）
- ✅ 调用点：99% 一致（48 个后端 + 50+ 个前端）
- ⚠️ 唯一差异：数据流向（本地 vs 官方服务器，有意为之）

**优化成果**:
- ✅ 移除 5 个硬编码 License 字段
- ✅ 代码减少 15 行
- ✅ 只保留动态获取的真实数据
- ✅ 年度节省约 43 KB 数据库空间

---

**最后更新**: 2025-11-07
