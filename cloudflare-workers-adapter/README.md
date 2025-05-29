# TLS-n8n Cloudflare Workers Adapter

A serverless adaptation of n8n workflow automation platform for Cloudflare Workers, providing edge-distributed workflow execution with global low latency.

## 架构概述

### 原始架构 vs Workers架构

| 组件 | 原始架构 | Workers架构 |
|------|----------|-------------|
| Web服务器 | Express.js | Hono.js + Fetch API |
| 数据库 | PostgreSQL/MySQL | Cloudflare D1 |
| 文件存储 | 本地文件系统 | Cloudflare R2 |
| 队列系统 | Bull + Redis | Durable Objects |
| WebSocket | Socket.io | WebSocket API |
| 会话存储 | 内存/Redis | KV Store |
| 缓存 | Redis | KV Store |

## 适配策略

### 阶段1：核心API适配
- [x] 基础项目结构
- [ ] Express.js → Hono.js 迁移
- [ ] 数据库层抽象
- [ ] 基础路由适配

### 阶段2：数据层适配
- [ ] TypeORM → D1 适配器
- [ ] 文件存储 → R2 适配
- [ ] 会话管理 → KV Store

### 阶段3：工作流引擎适配
- [ ] 工作流执行环境
- [ ] 节点执行适配
- [ ] 队列系统重构

### 阶段4：前端集成
- [ ] 静态资源服务
- [ ] WebSocket支持
- [ ] 实时通信

## 技术限制

### Cloudflare Workers限制
- CPU时间：10ms (免费) / 30s (付费)
- 内存：128MB
- 请求大小：100MB
- 响应大小：100MB
- 并发连接：1000个

### 适配挑战
1. **长时间运行的工作流**：需要拆分为多个短任务
2. **文件处理**：大文件需要流式处理
3. **数据库事务**：D1的事务支持有限
4. **WebSocket**：需要使用Durable Objects

## 开始使用

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 部署到Cloudflare
npm run deploy
```

## 环境变量

```bash
# Cloudflare配置
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# 数据库
DATABASE_ID=your_d1_database_id

# 存储
R2_BUCKET_NAME=your_r2_bucket

# KV存储
KV_NAMESPACE_ID=your_kv_namespace
```