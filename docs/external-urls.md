# n8n External URL Reference

All outbound connections that n8n makes to external services, organized by
whether they are configurable via environment variables or hardcoded.

---

## Table of Contents

- [قابل تغییر با env](#قابل-تغییر-با-env)
- [Hardcoded — قابل تغییر نیست](#hardcoded--قابل-تغییر-نیست)
- [خلاصه وضعیت](#خلاصه-وضعیت)

---

## قابل تغییر با env

### License

| URL پیش‌فرض | env variable | زمان فراخوانی |
|-------------|-------------|--------------|
| `https://license.n8n.io/v1` | `N8N_LICENSE_SERVER_URL` | هر startup و تمدید دوره‌ای |

---

### Templates

| URL پیش‌فرض | env variable | زمان فراخوانی |
|-------------|-------------|--------------|
| `https://api.n8n.io/api/` | `N8N_TEMPLATES_HOST` | هنگام باز کردن پنل templates |
| `https://dynamic-templates.n8n.io/templates` | `N8N_DYNAMIC_TEMPLATES_HOST` | templates متنی (contextual) |

---

### Version Notifications

| URL پیش‌فرض | env variable | زمان فراخوانی |
|-------------|-------------|--------------|
| `https://api.n8n.io/api/versions/` | `N8N_VERSION_NOTIFICATIONS_ENDPOINT` | بررسی دوره‌ای نسخه جدید |
| `https://api.n8n.io/api/whats-new` | `N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENDPOINT` | محتوای "What's New" |
| `https://docs.n8n.io/hosting/installation/updating/` | `N8N_VERSION_NOTIFICATIONS_INFO_URL` | لینک راهنمای ارتقا (فقط نمایش) |

غیرفعال‌سازی: `N8N_VERSION_NOTIFICATIONS_ENABLED=false`

---

### Dynamic Banners

| URL پیش‌فرض | env variable | زمان فراخوانی |
|-------------|-------------|--------------|
| `https://api.n8n.io/api/banners` | `N8N_DYNAMIC_BANNERS_ENDPOINT` | هنگام باز کردن UI |

غیرفعال‌سازی: `N8N_DYNAMIC_BANNERS_ENABLED=false`

---

### Diagnostics & Telemetry

| URL پیش‌فرض | env variable | زمان فراخوانی |
|-------------|-------------|--------------|
| `https://telemetry.n8n.io` (در `N8N_DIAGNOSTICS_CONFIG_FRONTEND`) | `N8N_DIAGNOSTICS_CONFIG_FRONTEND` | رویدادهای UI از frontend |
| `https://telemetry.n8n.io` (در `N8N_DIAGNOSTICS_CONFIG_BACKEND`) | `N8N_DIAGNOSTICS_CONFIG_BACKEND` | رویدادهای backend |
| `https://ph.n8n.io` | `N8N_DIAGNOSTICS_POSTHOG_API_HOST` | feature flags و analytics |

غیرفعال‌سازی: `N8N_DIAGNOSTICS_ENABLED=false`

> **توجه:** غیرفعال کردن diagnostics، ارتباط با `api-rs.n8n.io` و `cdn-rs.n8n.io` را متوقف **نمی‌کند** (ر.ک. بخش hardcoded).

---

### Community Packages (NPM Registry)

| URL پیش‌فرض | env variable | زمان فراخوانی |
|-------------|-------------|--------------|
| `https://registry.npmjs.org` | `N8N_COMMUNITY_PACKAGES_REGISTRY` | نصب و بروزرسانی community packages |

> این env فقط آدرس registry برای `npm install` را کنترل می‌کند. تأیید صحت
> package‌ها از `api.n8n.io` انجام می‌شود و hardcoded است (ر.ک. پایین).

---

### AI & LLM

| URL پیش‌فرض | env variable | زمان فراخوانی |
|-------------|-------------|--------------|
| *(empty — باید set شود)* | `N8N_AI_ASSISTANT_BASE_URL` | سرویس AI assistant |
| *(empty — باید set شود)* | `N8N_INSTANCE_AI_MODEL_URL` | LLM endpoint سفارشی (OpenAI-compatible) |
| *(empty — باید set شود)* | `N8N_INSTANCE_AI_SEARXNG_URL` | SearXNG برای web search |
| *(empty — باید set شود)* | `DAYTONA_API_URL` | Daytona sandbox API |
| *(empty — باید set شود)* | `N8N_SANDBOX_SERVICE_URL` | n8n sandbox service |

---

### OpenTelemetry (OTEL)

| URL پیش‌فرض | env variable | زمان فراخوانی |
|-------------|-------------|--------------|
| `http://localhost:4318` | `N8N_OTEL_EXPORTER_OTLP_ENDPOINT` | ارسال trace به OTEL collector |

فعال‌سازی: `N8N_OTEL_ENABLED=true`

---

### Error Tracking (Sentry)

| URL پیش‌فرض | env variable | زمان فراخوانی |
|-------------|-------------|--------------|
| *(empty)* | `N8N_SENTRY_DSN` | ارسال خطاهای backend به Sentry |
| *(empty)* | `N8N_FRONTEND_SENTRY_DSN` | ارسال خطاهای frontend به Sentry |

تنها در صورت set بودن DSN فعال می‌شود.

---

## Hardcoded — قابل تغییر نیست

### License Registration

| URL | فایل | زمان فراخوانی |
|-----|------|--------------|
| `https://enterprise.n8n.io/enterprise-trial` | [packages/cli/src/license/license.service.ts:60](../packages/cli/src/license/license.service.ts) | هنگام فعال‌سازی enterprise trial — یک POST request |
| `https://enterprise.n8n.io/community-registered` | [packages/cli/src/license/license.service.ts:86](../packages/cli/src/license/license.service.ts) | هنگام ثبت community edition |

این دو URL برای ثبت instance با سرور n8n هستند و هیچ env ای آن‌ها را override نمی‌کند.

---

### Community Package Verification

| URL | فایل | زمان فراخوانی |
|-----|------|--------------|
| `https://api.n8n.io/api/package` | [packages/cli/src/modules/community-packages/community-packages.service.ts:193](../packages/cli/src/modules/community-packages/community-packages.service.ts) | دریافت متادیتا و اطلاعات package از n8n |
| `https://api.n8n.io/api/community-nodes` | [packages/cli/src/modules/community-packages/community-node-types-utils.ts:32](../packages/cli/src/modules/community-packages/community-node-types-utils.ts) | لیست node های verified |
| `https://api-staging.n8n.io/api/community-nodes` | [packages/cli/src/modules/community-packages/community-node-types-utils.ts:31](../packages/cli/src/modules/community-packages/community-node-types-utils.ts) | همان — نسخه staging (برای development) |

> **تفاوت با `N8N_COMMUNITY_PACKAGES_REGISTRY`:** آن env آدرس npm registry را کنترل می‌کند (برای `npm install`). این URL ها برای تأیید صحت و دریافت متادیتای node‌ها از سرور n8n هستند و جداگانه hardcoded اند.

غیرفعال‌سازی کامل: `N8N_COMMUNITY_PACKAGES_ENABLED=false`

---

### Telemetry (hardcoded بخش)

| URL | فایل | زمان فراخوانی |
|-----|------|--------------|
| `https://api-rs.n8n.io/sourceConfig` | [packages/cli/src/controllers/telemetry.controller.ts:48](../packages/cli/src/controllers/telemetry.controller.ts) | دریافت تنظیمات telemetry از backend n8n |
| `https://cdn-rs.n8n.io/v1/ra.min.js` | [packages/frontend/editor-ui/src/app/plugins/telemetry/index.ts:255](../packages/frontend/editor-ui/src/app/plugins/telemetry/index.ts) | لود script تلمتری frontend در مرورگر کاربر |

> **مهم:** این دو حتی با `N8N_DIAGNOSTICS_ENABLED=false` نیز ممکن است فراخوانده شوند.
> `api-rs.n8n.io` در telemetry controller backend صدا زده می‌شود.
> `cdn-rs.n8n.io` یک script را در مرورگر کاربر inject می‌کند.

---

### Subscription Management (Frontend)

| URL | فایل | زمان فراخوانی |
|-----|------|--------------|
| `https://subscription.n8n.io` | [packages/frontend/editor-ui/src/features/settings/usage/usage.store.ts:65](../packages/frontend/editor-ui/src/features/settings/usage/usage.store.ts) | لینک صفحه مدیریت plan (production) |
| `https://staging-subscription.n8n.io` | [packages/frontend/editor-ui/src/features/settings/usage/usage.store.ts:66](../packages/frontend/editor-ui/src/features/settings/usage/usage.store.ts) | همان — staging |

این URL ها فقط به صورت لینک در UI نمایش داده می‌شوند و request مستقیمی از backend ایجاد نمی‌کنند.

---

### API Calls از Frontend

| URL | فایل | زمان فراخوانی |
|-----|------|--------------|
| `https://api.n8n.io/api` | [packages/frontend/editor-ui/src/app/constants/urls.ts:30](../packages/frontend/editor-ui/src/app/constants/urls.ts) | default API host در frontend |
| `https://api.n8n.io/api` | [packages/frontend/editor-ui/src/app/api/workflow-webhooks.ts:4](../packages/frontend/editor-ui/src/app/api/workflow-webhooks.ts) | API calls برای workflow webhooks |
| `https://api.n8n.io/api` | [packages/@n8n/ai-workflow-builder.ee/src/tools/web/templates.ts:14](../packages/@n8n/ai-workflow-builder.ee/src/tools/web/templates.ts) | دریافت templates در AI builder |
| `https://api.n8n.io/api` | [packages/@n8n/instance-ai/src/tools/templates/template-api.ts:12](../packages/@n8n/instance-ai/src/tools/templates/template-api.ts) | دریافت templates در Instance AI |
| `https://api.n8n.io/api` | [packages/@n8n/constants/src/api.ts:1](../packages/@n8n/constants/src/api.ts) | constant مشترک بین پکیج‌ها |

> این آدرس‌ها با وجود اینکه در ثابت‌های جداگانه تعریف شده‌اند، قابل override با env نیستند.

---

## خلاصه وضعیت

```
سرویس                         قابل تغییر؟   env / توضیح
─────────────────────────────────────────────────────────────────
License server                    ✅          N8N_LICENSE_SERVER_URL
Templates API                     ✅          N8N_TEMPLATES_HOST
Dynamic Templates                 ✅          N8N_DYNAMIC_TEMPLATES_HOST
Version check                     ✅          N8N_VERSION_NOTIFICATIONS_ENDPOINT
What's New                        ✅          N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENDPOINT
Dynamic banners                   ✅          N8N_DYNAMIC_BANNERS_ENDPOINT
Telemetry (Segment)               ✅          N8N_DIAGNOSTICS_CONFIG_FRONTEND/BACKEND
PostHog                           ✅          N8N_DIAGNOSTICS_POSTHOG_API_HOST
NPM registry                      ✅          N8N_COMMUNITY_PACKAGES_REGISTRY
OTEL collector                    ✅          N8N_OTEL_EXPORTER_OTLP_ENDPOINT
Sentry                            ✅          N8N_SENTRY_DSN / N8N_FRONTEND_SENTRY_DSN
AI Assistant                      ✅          N8N_AI_ASSISTANT_BASE_URL
Custom LLM                        ✅          N8N_INSTANCE_AI_MODEL_URL
SearXNG                           ✅          N8N_INSTANCE_AI_SEARXNG_URL
Daytona sandbox                   ✅          DAYTONA_API_URL
─────────────────────────────────────────────────────────────────
Enterprise trial registration     ❌          hardcoded: enterprise.n8n.io
Community edition registration    ❌          hardcoded: enterprise.n8n.io
Community package metadata        ❌          hardcoded: api.n8n.io/api/package
Community node verification       ❌          hardcoded: api.n8n.io/api/community-nodes
Telemetry config (backend)        ❌          hardcoded: api-rs.n8n.io/sourceConfig
Telemetry script (frontend)       ❌          hardcoded: cdn-rs.n8n.io/v1/ra.min.js
Subscription UI link              ❌          hardcoded: subscription.n8n.io (لینک فقط)
API constants (frontend/AI)       ❌          hardcoded: api.n8n.io/api در چند فایل
```

---

*مستند شده از سورس کد n8n v2.18.0*
