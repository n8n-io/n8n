# 🚀 TLS-n8n Cloudflare Workers 部署指南

本指南将帮助您将 TLS-n8n 部署到 Cloudflare Workers 平台。

## 📋 前置要求

### 必需工具
- **Node.js 18+**: [下载安装](https://nodejs.org/)
- **Cloudflare 账户**: [注册账户](https://dash.cloudflare.com/sign-up)
- **Wrangler CLI**: Cloudflare 官方命令行工具

### 安装 Wrangler CLI
```bash
npm install -g wrangler
```

## 🔧 环境配置

### 1. Cloudflare 账户设置

1. **登录 Cloudflare**:
```bash
wrangler login
```

2. **获取账户 ID**:
```bash
wrangler whoami
```
记录显示的 Account ID，稍后需要用到。

### 2. 创建 Cloudflare 资源

#### 创建 D1 数据库
```bash
wrangler d1 create n8n-db
```
记录返回的 database_id。

#### 创建 R2 存储桶
```bash
wrangler r2 bucket create n8n-storage
```

#### 创建 KV 命名空间
```bash
wrangler kv:namespace create "n8n-cache"
```
记录返回的 id。

### 3. 配置 wrangler.toml

更新 `wrangler.toml` 文件中的配置：

```toml
name = "tls-n8n"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# 替换为您的账户 ID
account_id = "your-account-id-here"

[vars]
NODE_ENV = "production"
N8N_HOST = "your-domain.com"
N8N_PORT = "443"
N8N_PROTOCOL = "https"

# 替换为您的数据库 ID
[[d1_databases]]
binding = "DB"
database_name = "n8n-db"
database_id = "your-database-id-here"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "n8n-storage"

# 替换为您的 KV 命名空间 ID
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id-here"

[[durable_objects.bindings]]
name = "WORKFLOW_EXECUTOR"
class_name = "WorkflowExecutor"

[[durable_objects.bindings]]
name = "WEBSOCKET_HANDLER"
class_name = "WebSocketHandler"

[build]
command = "npm run build"

[[migrations]]
tag = "v1"
new_classes = ["WorkflowExecutor", "WebSocketHandler"]
```

## 🔐 安全配置

### 设置环境变量

生成并设置安全密钥：

```bash
# 生成 JWT 密钥
openssl rand -base64 32 | wrangler secret put JWT_SECRET

# 生成加密密钥
openssl rand -base64 32 | wrangler secret put ENCRYPTION_KEY
```

## 📦 项目构建

### 1. 安装依赖
```bash
cd cloudflare-workers-adapter
npm install
```

### 2. 构建项目
```bash
npm run build
```

### 3. 初始化数据库
```bash
# 本地测试
wrangler d1 execute n8n-db --local --file=./schema.sql

# 生产环境
wrangler d1 execute n8n-db --file=./schema.sql
```

## 🚀 部署流程

### 方式一：自动化脚本部署

使用提供的自动化脚本：

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 方式二：手动部署

1. **本地测试**:
```bash
npm run dev
```
访问 http://localhost:8787 测试功能。

2. **部署到生产**:
```bash
npm run deploy
```

3. **验证部署**:
```bash
curl https://your-worker.your-subdomain.workers.dev/healthz
```

## 🌐 自定义域名配置

### 1. 添加域名到 Cloudflare

1. 在 Cloudflare 控制台添加您的域名
2. 更新 DNS 记录指向 Cloudflare

### 2. 配置 Workers 路由

在 `wrangler.toml` 中添加：

```toml
[env.production]
routes = [
  { pattern = "n8n.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

### 3. 重新部署

```bash
wrangler deploy --env production
```

## 🔍 验证部署

### 健康检查
```bash
curl https://your-domain.com/healthz
```

预期响应：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0-workers",
  "deployment": "cloudflare-workers",
  "services": {
    "database": "connected",
    "storage": "connected",
    "cache": "connected"
  }
}
```

### API 测试
```bash
# 注册用户
curl -X POST https://your-domain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# 登录获取 token
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 📊 监控和日志

### 查看实时日志
```bash
wrangler tail
```

### 查看分析数据
访问 [Cloudflare 控制台](https://dash.cloudflare.com) 查看：
- 请求量统计
- 错误率监控
- 响应时间分析
- 资源使用情况

### 系统统计
```bash
curl https://your-domain.com/admin/stats
```

## 🔧 故障排除

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查数据库状态
wrangler d1 execute n8n-db --command="SELECT 1"

# 重新运行迁移
wrangler d1 execute n8n-db --file=./schema.sql
```

#### 2. 权限错误
```bash
# 检查账户权限
wrangler whoami

# 重新登录
wrangler logout
wrangler login
```

#### 3. 构建失败
```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build
```

#### 4. 部署超时
```bash
# 增加超时时间
wrangler deploy --compatibility-date=2024-01-01
```

### 调试模式

启用详细日志：
```bash
wrangler dev --local --persist
```

## 📈 性能优化

### 1. 冷启动优化
- 使用 ES modules
- 减少依赖包大小
- 启用 bundling

### 2. 数据库优化
```sql
-- 创建索引
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_executions_workflow_id ON executions(workflow_id);
```

### 3. 缓存策略
```javascript
// 使用 KV 缓存频繁访问的数据
await env.CACHE.put(key, value, { expirationTtl: 3600 });
```

## 🔄 更新和维护

### 更新部署
```bash
git pull origin main
npm install
npm run build
npm run deploy
```

### 数据库迁移
```bash
# 创建新迁移文件
echo "ALTER TABLE users ADD COLUMN new_field TEXT;" > migrations/002_add_field.sql

# 应用迁移
wrangler d1 execute n8n-db --file=migrations/002_add_field.sql
```

### 备份数据
```bash
# 导出数据库
wrangler d1 export n8n-db --output=backup.sql

# 备份到 R2
wrangler r2 object put n8n-storage/backups/$(date +%Y%m%d).sql --file=backup.sql
```

## 💰 成本估算

### Cloudflare Workers 定价
- **免费层**: 100,000 请求/天
- **付费层**: $5/月 + $0.50/百万请求

### 预估成本（月）
- **小型团队** (< 10 用户): $5-15
- **中型团队** (10-50 用户): $15-50  
- **大型团队** (50+ 用户): $50-200

### 成本优化建议
1. 使用缓存减少数据库查询
2. 优化 Durable Objects 使用
3. 合理设置 TTL
4. 监控请求量和资源使用

## 🆘 获取帮助

### 官方文档
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [D1 数据库文档](https://developers.cloudflare.com/d1/)

### 社区支持
- [Cloudflare Discord](https://discord.gg/cloudflaredev)
- [n8n 社区论坛](https://community.n8n.io/)
- [GitHub Issues](https://github.com/TLS-802/TLS-n8n/issues)

---

🎉 **恭喜！您已成功部署 TLS-n8n 到 Cloudflare Workers！**

现在您可以享受全球边缘分布的工作流自动化平台了。