# @omi/n8n-extensions

OmiGroup extensions for n8n self-hosted. Adds enterprise-grade features without modifying n8n core code.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    n8n Core                          │
│                (KHÔNG SỬA ĐỔI)                      │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ ExternalHooks │───▶│ EXTERNAL_HOOK_FILES env │   │
│  └──────────────┘    └──────────┬───────────────┘   │
│                                 │                    │
└─────────────────────────────────┼────────────────────┘
                                  │
                  ┌───────────────▼────────────────┐
                  │    @omi/n8n-extensions          │
                  │    (package riêng biệt)         │
                  │                                 │
                  │  ┌─ Google SSO ──────────────┐  │
                  │  ├─ Domain Whitelist ────────┤  │
                  │  ├─ Department Management ───┤  │
                  │  ├─ Template Hub ────────────┤  │
                  │  ├─ Usage Analytics ─────────┤  │
                  │  ├─ User Management ─────────┤  │
                  │  └─ Custom Nodes ────────────┘  │
                  │                                 │
                  │  DB: omi-extensions.sqlite       │
                  │  (riêng biệt, không đụng n8n)   │
                  └─────────────────────────────────┘
```

**Nguyên tắc:**
- n8n core = 0 thay đổi → `git pull upstream` bất kỳ lúc nào
- Mọi extension chạy qua `EXTERNAL_HOOK_FILES`
- Data riêng lưu SQLite riêng biệt
- Truy cập n8n DB chỉ qua hook context (`this.dbCollections`)

## Features

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Google SSO | `/omi/auth/google/login` | Sign in/up tự động bằng Google |
| Domain Whitelist | `/omi/admin/domains` | Giới hạn email domain được phép |
| Departments | `/omi/departments` | Quản lý phòng ban + gán user |
| Template Hub | `/omi/templates` | Chia sẻ workflow templates nội bộ |
| Usage Stats | `/omi/admin/stats/*` | Thống kê sử dụng chi tiết |
| User Management | `/omi/admin/users` | Quản lý user mở rộng |
| Health Check | `/omi/health` | Kiểm tra trạng thái extension |

## Quick Start

### 1. Setup Google OAuth2

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Tạo OAuth 2.0 Client ID (Web application)
3. Thêm Authorized redirect URI: `http://localhost:5678/omi/auth/google/callback`
4. Lấy Client ID và Client Secret

### 2. Configure

```bash
cp .env.example .env
# Điền OMI_GOOGLE_CLIENT_ID, OMI_GOOGLE_CLIENT_SECRET, etc.
```

### 3. Build & Run

```bash
# Build extensions
pnpm install
pnpm build

# Run with Docker
docker compose up -d
```

### 4. Access

- n8n Dashboard: http://localhost:5678
- Google Sign-In: http://localhost:5678/omi/auth/google/login
- Health Check: http://localhost:5678/omi/health

## API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/omi/auth/google/login` | Public | Initiate Google SSO |
| GET | `/omi/auth/google/callback` | Public | OAuth callback |
| GET | `/omi/auth/google/status` | Public | SSO status |

### Domain Whitelist (Admin)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/omi/admin/domains` | Admin | List all domains |
| POST | `/omi/admin/domains` | Admin | Add domain |
| DELETE | `/omi/admin/domains/:domain` | Admin | Remove domain |

### Departments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/omi/departments` | User | List departments |
| GET | `/omi/departments/:id` | User | Department detail |
| POST | `/omi/departments` | Admin | Create department |
| PUT | `/omi/departments/:id` | Admin | Update department |
| DELETE | `/omi/departments/:id` | Admin | Delete department |
| POST | `/omi/departments/:id/members` | Admin | Add member |
| DELETE | `/omi/departments/:id/members/:userId` | Admin | Remove member |
| GET | `/omi/my/departments` | User | My departments |

### Templates
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/omi/templates` | User | List/search templates |
| GET | `/omi/templates/:id` | User | Template detail |
| POST | `/omi/templates` | User | Publish template |
| POST | `/omi/templates/:id/deploy` | User | Deploy template |
| POST | `/omi/templates/:id/rate` | User | Rate template |
| PUT | `/omi/templates/:id/approve` | Admin | Approve/reject |
| DELETE | `/omi/templates/:id` | Author/Admin | Delete template |
| GET | `/omi/templates/categories` | User | List categories |
| POST | `/omi/templates/categories` | Admin | Create category |

### Usage Stats (Admin)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/omi/admin/stats/overview` | Admin | Overall stats |
| GET | `/omi/admin/stats/departments` | Admin | By department |
| GET | `/omi/admin/stats/users` | Admin | By user |
| GET | `/omi/admin/stats/trends` | Admin | Daily trends |
| GET | `/omi/admin/stats/export` | Admin | Export CSV |
| GET | `/omi/my/stats` | User | My stats |

### User Management (Admin)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/omi/admin/users` | Admin | List all users |
| PUT | `/omi/admin/users/:id/department` | Admin | Assign department |
| GET | `/omi/admin/users/inactive` | Admin | Inactive users |

## Update n8n

```bash
# n8n core không bị sửa đổi, update bình thường:
docker compose pull
docker compose up -d
```

## File Structure

```
omi-n8n-extensions/
├── src/
│   ├── hooks/
│   │   └── omi-hooks.ts          # Entry point (loaded by n8n)
│   ├── config/
│   │   └── index.ts              # Configuration from env vars
│   ├── database/
│   │   └── index.ts              # Separate SQLite + migrations
│   ├── auth/
│   │   └── google-oidc/
│   │       ├── index.ts          # SSO routes
│   │       └── user-sync.ts      # User find/create
│   ├── admin/
│   │   ├── domain-whitelist/
│   │   │   └── index.ts          # Domain management
│   │   ├── user-management/
│   │   │   └── index.ts          # Extended user admin
│   │   └── usage-stats/
│   │       └── index.ts          # Execution tracking
│   ├── departments/
│   │   └── index.ts              # Department CRUD
│   ├── templates/
│   │   └── index.ts              # Template Hub
│   ├── middleware/
│   │   └── auth-guard.ts         # Auth & admin middleware
│   ├── utils/
│   │   ├── jwt.ts                # n8n-compatible JWT
│   │   └── n8n-db.ts             # n8n DB helpers
│   ├── nodes/                    # Custom nodes (via N8N_CUSTOM_EXTENSIONS)
│   └── index.ts                  # Package exports
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```
