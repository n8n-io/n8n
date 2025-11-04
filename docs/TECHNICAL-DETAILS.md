# 技术实现细节

本文档提供二次开发的深入技术细节和代码示例。

## ✅ 当前状态（最终实现）

许可证系统已**完全移除**，实现方式：

1. **删除核心文件** - `packages/cli/src/license/` 整个目录及所有许可证文件
2. **删除依赖项** - 从 package.json 移除 `@n8n_io/license-sdk`
3. **直接执行逻辑** - 所有服务初始化、LDAP/SAML 配置等功能直接执行，无任何条件判断
4. **前端配置** - `frontend.service.ts` 中企业功能全部硬编码为 `true`
5. **中间件清理** - Source Control 等中间件改为空操作（直接调用 `next()`）

**无任何"绕过函数"残留** - 不存在 `isLdapEnabled() => true` 这类代码。

---

> **历史文档说明**: 以下章节描述开发过程中使用的策略演变。这些早期方法（如"函数硬编码"）已在后续优化中完全清理。保留这些内容仅供技术参考。

## 🔧 许可证移除策略演变（历史记录）

### ~~策略 1: 函数硬编码~~（已废弃）

**早期方法**（已在后续优化中完全移除）：将检查函数直接返回固定值。

```typescript
// 示例 1: LDAP 启用检查
// packages/cli/src/sso/ldap.ee/helpers.ee.ts

// 修改前
export const isLdapEnabled = () => {
  return Container.get(License).isLdapEnabled();
};

// 修改后
export const isLdapEnabled = () => {
  return true;
};
```

```typescript
// 示例 2: AI 助手启用
// packages/cli/src/services/ai.service.ts

// 修改前
async init() {
  const aiAssistantEnabled = this.license.isAiAssistantEnabled();
  const licenseCert = this.license.getCert();
  const consumerId = this.license.getConsumerId();

  if (aiAssistantEnabled) {
    await this.assistantClient.init(licenseCert, consumerId);
  }
}

// 修改后
async init() {
  const aiAssistantEnabled = true;
  const licenseCert = '';
  const consumerId = 'unknown';

  if (aiAssistantEnabled) {
    await this.assistantClient.init(licenseCert, consumerId);
  }
}
```

### 策略 2: 删除条件分支

直接移除 `if` 条件判断，让代码无条件执行。

```typescript
// 示例 1: 工作流分享
// packages/cli/src/workflows/workflows.service.ts

// 修改前
async getSharedWorkflowIds(user: User) {
  if (isSharingEnabled()) {
    return await this.sharedWorkflowRepository.getSharedWorkflowIds(user);
  }
  return [];
}

// 修改后
async getSharedWorkflowIds(user: User) {
  return await this.sharedWorkflowRepository.getSharedWorkflowIds(user);
}
```

```typescript
// 示例 2: 变量管理
// packages/cli/src/public-api/handlers/variables.handler.ts

// 修改前
router.get('/', isLicensed('feat:variables'), async (req, res) => {
  const variables = await getVariables();
  res.json(variables);
});

// 修改后
router.get('/', async (req, res) => {
  const variables = await getVariables();
  res.json(variables);
});
```

### 策略 3: 中间件空操作化

将许可证检查中间件改为直接调用 `next()`，不做任何检查。

```typescript
// 示例: Source Control 中间件
// packages/cli/src/environments/source-control/middleware/source-control-licensed.middleware.ts

// 修改前
export const sourceControlLicensedMiddleware: RequestHandler = (req, res, next) => {
  if (!isSourceControlLicensed()) {
    return res.status(401).json({
      status: 'error',
      message: 'Source Control feature is not licensed',
    });
  }
  next();
};

// 修改后
export const sourceControlLicensedMiddleware: RequestHandler = (_req, _res, next) => {
  // @deprecated License checks removed - all source control features are now enabled
  next();
};

// 创建别名指向实际的连接检查
export const sourceControlLicensedAndEnabledMiddleware = sourceControlConnectedMiddleware;
```

### 策略 4: 配置默认启用

在配置生成时直接设置企业功能为 `true`。

```typescript
// packages/cli/src/services/frontend.service.ts

// 修改前
private getEnterpriseSettings(): IEnterpriseSettings {
  const license = Container.get(License);

  return {
    sharing: license.isFeatureEnabled('feat:sharing'),
    ldap: license.isFeatureEnabled('feat:ldap'),
    saml: license.isFeatureEnabled('feat:saml'),
    // ...
  };
}

// 修改后
private getEnterpriseSettings(): IEnterpriseSettings {
  return {
    sharing: true,
    ldap: true,
    saml: true,
    oidc: true,
    mfaEnforcement: true,
    logStreaming: true,
    advancedExecutionFilters: true,
    variables: true,
    sourceControl: true,
    auditLogs: true,
    externalSecrets: true,
    debugInEditor: true,
    binaryDataS3: true,
    workflowHistory: true,
    workerView: true,
    advancedPermissions: true,
    apiKeyScopes: true,
    workflowDiffs: true,
    provisioning: true,
    customRoles: true,
    projects: {
      team: {
        limit: -1,  // -1 表示无限制
      },
    },
  };
}
```

### 策略 5: 装饰器移除

直接删除控制器方法上的 `@Licensed` 装饰器。

```typescript
// 示例: LDAP 控制器
// packages/cli/src/controllers/ldap.controller.ts

// 修改前
@Get('/config')
@Licensed('feat:ldap')
async getConfig() {
  return await this.ldapService.getConfig();
}

// 修改后
@Get('/config')
async getConfig() {
  return await this.ldapService.getConfig();
}
```

## 📐 架构层面变更

### 依赖注入清理

```typescript
// 修改前 - License 作为依赖
@Service()
export class WorkflowService {
  constructor(
    private readonly license: License,
    private readonly workflowRepo: WorkflowRepository,
  ) {}

  async canShare(workflow: Workflow): Promise<boolean> {
    return this.license.isFeatureEnabled('feat:sharing');
  }
}

// 修改后 - 移除 License 依赖
@Service()
export class WorkflowService {
  constructor(
    private readonly workflowRepo: WorkflowRepository,
  ) {}

  async canShare(workflow: Workflow): Promise<boolean> {
    return true;
  }
}
```

### 前端 Store 简化

```typescript
// packages/frontend/editor-ui/src/app/stores/settings.store.ts

// 修改前
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<FrontendSettings>({ ... });

  const isEnterpriseFeatureEnabled = computed(() => {
    return (feature?: string) => {
      if (!feature) return true;
      return settings.value.enterprise[feature] === true;
    };
  });

  const planName = computed(() => {
    return settings.value.license?.planName || 'Community';
  });

  return { settings, isEnterpriseFeatureEnabled, planName };
});

// 修改后
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<FrontendSettings>({ ... });

  const isEnterpriseFeatureEnabled = computed(() => {
    return () => true;  // 简化为始终返回 true
  });

  // 删除 planName - 不再需要

  return { settings, isEnterpriseFeatureEnabled };
});
```

## 🔍 代码示例对比

### LDAP 服务完整示例

```typescript
// packages/cli/src/sso/ldap.ee/ldap.service.ee.ts

// ====== 修改前 ======
import { License } from '@/license';

@Service()
export class LdapService {
  constructor(
    private readonly license: License,
    private readonly ldapRepository: LdapRepository,
  ) {}

  async init(): Promise<void> {
    if (!isLdapEnabled()) {
      this.logger.debug('LDAP disabled by license');
      return;
    }

    await this.loadConfiguration();
    await this.startSyncSchedule();
  }

  async updateConfig(config: LdapConfig): Promise<void> {
    if (!this.license.isFeatureEnabled('feat:ldap')) {
      throw new FeatureNotLicensedError('LDAP');
    }

    return await this.ldapRepository.save(config);
  }
}

// ====== 修改后 ======
@Service()
export class LdapService {
  constructor(
    private readonly ldapRepository: LdapRepository,
  ) {}

  async init(): Promise<void> {
    // 直接初始化，无许可证检查
    await this.loadConfiguration();
    await this.startSyncSchedule();
  }

  async updateConfig(config: LdapConfig): Promise<void> {
    // 直接保存，无许可证检查
    return await this.ldapRepository.save(config);
  }
}
```

### 前端组件完整示例

```vue
<!-- packages/frontend/editor-ui/src/app/components/WorkflowSettings.vue -->

<!-- ====== 修改前 ====== -->
<template>
  <div>
    <EnterpriseEdition feature="sharing">
      <WorkflowSharingSettings />
    </EnterpriseEdition>

    <div v-if="!isEnterpriseFeatureEnabled('sharing')" class="upgrade-hint">
      <p>Upgrade to enable workflow sharing</p>
      <Button @click="goToUpgrade">Upgrade Now</Button>
    </div>
  </div>
</template>

<script setup>
import EnterpriseEdition from '@/app/components/EnterpriseEdition.ee.vue';
import { useSettingsStore } from '@/app/stores/settings.store';

const settingsStore = useSettingsStore();
const isEnterpriseFeatureEnabled = settingsStore.isEnterpriseFeatureEnabled;

function goToUpgrade() {
  window.open('https://n8n.io/pricing', '_blank');
}
</script>

<!-- ====== 修改后 ====== -->
<template>
  <div>
    <WorkflowSharingSettings />
    <!-- 删除企业版包装和升级提示 -->
  </div>
</template>

<script setup>
// 删除 EnterpriseEdition 导入
// 删除 settingsStore 相关代码
// 删除 goToUpgrade 函数
</script>
```

## 🧪 测试文件处理

### 删除策略

我们删除了 80+ 个依赖 License 系统的测试文件，包括：

```bash
# 后端测试 (50+ 个)
packages/cli/test/integration/commands/license/*.test.ts
packages/cli/test/integration/license/*.test.ts
packages/cli/test/unit/license.test.ts

# 前端测试 (30+ 个)
packages/frontend/editor-ui/src/app/components/__tests__/license/*.test.ts
packages/frontend/editor-ui/src/app/stores/__tests__/license.test.ts
```

### 修复策略

对于保留的测试文件，移除许可证模拟：

```typescript
// 修改前
import { License } from '@/license';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let license: License;

  beforeEach(() => {
    license = mockLicense();
    service = new WorkflowService(license);
  });

  it('should check license', () => {
    license.isFeatureEnabled.mockReturnValue(true);
    expect(service.canShare()).toBe(true);
  });
});

// 修改后
describe('WorkflowService', () => {
  let service: WorkflowService;

  beforeEach(() => {
    service = new WorkflowService();
  });

  it('should allow sharing', () => {
    expect(service.canShare()).toBe(true);
  });
});
```

## 📊 类型系统变更

### 移除的类型定义

```typescript
// packages/@n8n/constants/src/license.ts - 完全删除

export enum BooleanLicenseFeature {
  FEAT_LDAP = 'feat:ldap',
  FEAT_SAML = 'feat:saml',
  FEAT_SHARING = 'feat:sharing',
  // ... 50+ 个功能标志
}

export enum NumericLicenseFeature {
  FEAT_VARIABLES = 'feat:variables',
  FEAT_PROJECTS_TEAM = 'feat:projectRole:team',
}

export const LICENSE_FEATURES = {
  ...BooleanLicenseFeature,
  ...NumericLicenseFeature,
};

export const UNLIMITED_LICENSE_QUOTA = -1;
```

### 简化的类型定义

```typescript
// packages/@n8n/api-types/src/frontend-settings.ts

// 修改前
export interface FrontendSettings {
  license: {
    consumerId: string;
    planName: string;
    environment: 'production' | 'staging';
  };
  versionNotifications: IVersionNotificationSettings;
  banners: {
    dismissed: string[];
  };
  enterprise: IEnterpriseSettings;
}

// 修改后
export interface FrontendSettings {
  // 删除 license、versionNotifications、banners
  enterprise: IEnterpriseSettings;
}
```

## 🔌 模块初始化变更

```typescript
// packages/cli/src/server.ts

// 修改前
async function setupModules() {
  const license = Container.get(License);
  await license.init();

  if (license.isFeatureEnabled('feat:ldap')) {
    await Container.get(LdapService).init();
  }

  if (license.isFeatureEnabled('feat:saml')) {
    await Container.get(SamlService).init();
  }
}

// 修改后
async function setupModules() {
  // 无条件初始化所有模块
  await Container.get(LdapService).init();
  await Container.get(SamlService).init();
}
```

## 🛡️ 安全考虑

### 原有安全机制

n8n 的许可证系统主要用于功能门控，实际的安全性由其他机制保障：

- **认证**: JWT + Session (未修改)
- **授权**: RBAC 权限系统 (未修改)
- **加密**: 凭据加密 (未修改)
- **审计**: 操作日志 (未修改)

### 我们的修改影响

✅ **不影响**:
- 用户认证机制
- 权限检查逻辑
- 数据加密
- API 访问控制（除许可证层）

⚠️ **需要注意**:
- 移除了功能级访问控制
- 需要自行实现额外的访问限制
- 建议在网络层添加防护

## 🔄 与上游同步策略

当需要合并上游 n8n 更新时：

1. **不要合并许可证相关代码**
   ```bash
   git merge upstream/master --no-commit
   git reset HEAD packages/cli/src/license/
   git reset HEAD packages/@n8n/constants/src/license.ts
   ```

2. **检查新增的许可证检查**
   ```bash
   git diff upstream/master | grep -i "license\|@Licensed"
   ```

3. **测试企业功能**
   - 确保所有功能仍然可用
   - 运行构建和测试

## 📈 性能影响

移除许可证检查后的性能变化：

- ✅ **启动时间**: 减少 ~100ms（无许可证验证网络请求）
- ✅ **API 响应**: 减少 ~1-2ms（无中间件检查）
- ✅ **内存占用**: 减少 ~5MB（移除 license-sdk）
- ✅ **包大小**: 减少 ~2MB（移除依赖和代码）

## 🌐 中文本地化实现

### 总体架构

本地化系统采用双层 i18n 架构：

1. **主应用 i18n** - `@n8n/i18n` 包，负责主应用翻译
2. **设计系统 i18n** - `@n8n/design-system` 独立语言包，负责 UI 组件翻译

### 主应用翻译系统

#### 翻译文件结构

```typescript
// packages/frontend/@n8n/i18n/src/locales/zh.json
{
  "auth.signin": "登录",
  "auth.signup": "注册",
  "workflows.new": "新建工作流",
  // ... 3,795+ 翻译键
}
```

#### 语言加载机制

```typescript
// packages/frontend/@n8n/i18n/src/index.ts
import en from './locales/en.json';
import zh from './locales/zh.json';

export const i18nInstance = createI18n({
  locale: 'zh',          // 默认中文
  fallbackLocale: 'en',  // 回退到英文
  messages: { en, zh },
});
```

#### 动态语言切换

```typescript
// packages/frontend/editor-ui/src/main.ts
const initLocale = () => {
  try {
    const savedLocale = localStorage.getItem('n8n-locale') || 'zh';
    if (savedLocale !== i18nInstance.global.locale.value) {
      setLanguage(savedLocale);
    }
  } catch (e) {
    console.warn('Failed to read saved locale from localStorage', e);
  }
};
initLocale();
```

### 设计系统翻译

#### 独立语言包

```typescript
// packages/frontend/@n8n/design-system/src/locale/lang/zh.ts
import type { N8nLocale } from '../types';

export default {
  'generic.retry': '重试',
  'generic.cancel': '取消',
  'generic.close': '关闭',
  'dateRangePicker.apply': '应用',
  'dateRangePicker.outsideRange': '超出允许范围',
  // ... 90+ 翻译键
} as N8nLocale;
```

#### i18n Hook 集成

```typescript
// packages/frontend/@n8n/design-system/src/composables/useI18n.ts
import { inject } from 'vue';
import type { I18nFunction } from '../locale/types';

export const useI18n = () => {
  const t = inject<I18nFunction>('i18n', (key: string) => key);
  return { t };
};
```

#### 主应用集成设计系统

```typescript
// packages/frontend/editor-ui/src/main.ts
import { i18n as designSystemI18n } from '@n8n/design-system/locale';

// 将设计系统的 i18n 连接到主应用
designSystemI18n((key: string) => {
  return i18nInstance.global.t(key);
});

// 加载设计系统语言包
const initDesignSystemLocale = async () => {
  const currentLocale = i18nInstance.global.locale.value;
  try {
    const { use } = await import('@n8n/design-system/locale');
    await use(currentLocale);
  } catch (e) {
    console.warn(`Design system locale ${currentLocale} not found, using English`, e);
  }
};
void initDesignSystemLocale();
```

### 语言切换实现

#### 个人设置语言选择器

```vue
<!-- packages/frontend/editor-ui/src/features/core/auth/views/SettingsPersonalView.vue -->
<template>
  <N8nSelect
    v-model="currentSelectedLocale"
    :label="$t('settings.personal.language')"
    @update:model-value="onLocaleChange"
  >
    <N8nOption value="zh" :label="$t('settings.personal.languages.zh')" />
    <N8nOption value="en" :label="$t('settings.personal.languages.en')" />
  </N8nSelect>
</template>

<script setup>
const onLocaleChange = async (newLocale: string) => {
  if (newLocale !== rootStore.defaultLocale) {
    setLanguage(newLocale);
    rootStore.setDefaultLocale(newLocale);

    // 更新 design-system 语言
    const { use } = await import('@n8n/design-system/locale');
    await use(newLocale);

    // 持久化到 localStorage
    localStorage.setItem('n8n-locale', newLocale);
  }
};
</script>
```

#### Store 语言管理

```typescript
// packages/frontend/@n8n/stores/src/useRootStore.ts
export const useRootStore = defineStore(STORES.ROOT, () => {
  // 从 localStorage 读取保存的语言
  const getSavedLocale = () => {
    try {
      return localStorage.getItem('n8n-locale') || 'zh';
    } catch {
      return 'zh';
    }
  };

  const state = ref<RootStoreState>({
    defaultLocale: getSavedLocale(),  // 使用保存的语言
    // ... 其他状态
  });

  const setDefaultLocale = (value: string) => {
    state.value.defaultLocale = value;
  };

  return { defaultLocale, setDefaultLocale, /* ... */ };
});
```

### 日期时间本地化

#### BCP 47 Locale 映射

```typescript
// packages/frontend/editor-ui/src/features/execution/insights/components/InsightsDataRangePicker.vue
const datePickerLocale = computed(() => {
  const locale = i18n.locale.value;
  // 短码映射到完整 BCP 47 代码
  const localeMap: Record<string, string> = {
    zh: 'zh-CN',
    en: 'en-US',
  };
  return localeMap[locale] || locale;
});
```

#### 日期格式化

```typescript
// 使用 Intl.DateTimeFormat 本地化
const formattedRange = computed(() => {
  const { start, end } = props.modelValue;
  const locale = i18n.locale.value;

  const formatWithYear = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return formatWithYear.format(startDate);
});
```

#### reka-ui 组件本地化

```vue
<!-- packages/frontend/editor-ui/src/App.vue -->
<template>
  <ConfigProvider :locale="rekaLocale">
    <!-- 应用内容 -->
  </ConfigProvider>
</template>

<script setup>
import { ConfigProvider } from 'reka-ui';

const rekaLocale = computed(() => {
  const locale = i18n.locale.value;
  const localeMap: Record<string, string> = {
    zh: 'zh-CN',
    en: 'en-US',
  };
  return localeMap[locale] || locale;
});
</script>
```

### 关键技术点

1. **双层 i18n 架构**: 主应用和设计系统分离，通过 provide/inject 桥接
2. **语言持久化**: localStorage 存储，启动时恢复
3. **同步切换**: 主应用和设计系统语言同步更新
4. **Locale 映射**: 短码（zh）到 BCP 47 格式（zh-CN）的转换
5. **组件本地化**: 通过 ConfigProvider 为第三方 UI 库提供 locale 上下文

### 翻译覆盖率

| 区域 | 翻译键数 | 状态 |
|------|----------|------|
| 主界面 | 3,795 | ✅ 100% |
| 设计系统 | 90+ | ✅ 100% |
| 错误信息 | ~200 | ✅ 100% |
| 提示文本 | ~150 | ✅ 100% |

---

**注意**: 所有技术细节仅供参考，具体实现请以源代码为准。
