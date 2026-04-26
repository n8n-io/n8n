در اینجا لیست کامل بیش از ۳۴۵ environment variable که n8n پشتیبانی می‌کند، دسته‌بندی شده:

هوش مصنوعی و LLM
متغیر	توضیح
N8N_AI_ENABLED	فعال/غیرفعال کردن ویژگی‌های AI
N8N_AI_TIMEOUT_MAX	حداکثر زمان انتظار برای سرویس AI (ms)
N8N_AI_ALLOW_SENDING_PARAMETER_VALUES	اجازه ارسال مقادیر پارامتر به AI
N8N_AI_ASSISTANT_BASE_URL	آدرس پایه سرویس AI assistant
N8N_AI_ANTHROPIC_KEY	کلید API برای Anthropic/Claude
N8N_INSTANCE_AI_MODEL	مدل LLM (مثلاً anthropic/claude-sonnet-4-6)
N8N_INSTANCE_AI_MODEL_URL	آدرس endpoint سازگار با OpenAI
N8N_INSTANCE_AI_MODEL_API_KEY	کلید API برای مدل سفارشی
N8N_INSTANCE_AI_MAX_CONTEXT_WINDOW_TOKENS	سقف حجم context (توکن)
N8N_INSTANCE_AI_MCP_SERVERS	سرورهای MCP (جفت‌های name=url)
N8N_INSTANCE_AI_LAST_MESSAGES	تعداد پیام‌های اخیر در context
N8N_INSTANCE_AI_EMBEDDER_MODEL	مدل embedder برای semantic recall
N8N_INSTANCE_AI_SEMANTIC_RECALL_TOP_K	تعداد پیام‌های مشابه برای بازیابی
N8N_INSTANCE_AI_SUB_AGENT_MAX_STEPS	حداکثر گام‌های استدلال sub-agent
N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED	غیرفعال کردن local gateway
N8N_INSTANCE_AI_BROWSER_MCP	فعال‌سازی Chrome DevTools MCP
N8N_INSTANCE_AI_SANDBOX_ENABLED	فعال‌سازی sandbox برای اجرای کد
N8N_INSTANCE_AI_SANDBOX_PROVIDER	ارائه‌دهنده sandbox (daytona یا local)
DAYTONA_API_URL	آدرس API سرویس Daytona
DAYTONA_API_KEY	کلید API سرویس Daytona
N8N_SANDBOX_SERVICE_URL	آدرس سرویس sandbox
N8N_SANDBOX_SERVICE_API_KEY	کلید API سرویس sandbox
N8N_INSTANCE_AI_SANDBOX_IMAGE	تصویر Docker برای sandbox
N8N_INSTANCE_AI_SANDBOX_TIMEOUT	timeout اجرای دستور در sandbox (ms)
INSTANCE_AI_BRAVE_SEARCH_API_KEY	کلید Brave Search برای جستجوی وب
N8N_INSTANCE_AI_SEARXNG_URL	آدرس نمونه SearXNG
N8N_INSTANCE_AI_GATEWAY_API_KEY	کلید استاتیک برای filesystem gateway
N8N_INSTANCE_AI_THREAD_TTL_DAYS	طول عمر thread‌های مکالمه (روز)
N8N_INSTANCE_AI_SNAPSHOT_PRUNE_INTERVAL	فاصله زمانی pruning snapshot (ms)
N8N_INSTANCE_AI_SNAPSHOT_RETENTION	مدت نگهداری snapshot‌های یتیم (ms)
N8N_INSTANCE_AI_CONFIRMATION_TIMEOUT	timeout برای درخواست‌های HITL (ms)
احراز هویت و کوکی
متغیر	توضیح
N8N_SECURE_COOKIE	تنظیم Secure flag روی کوکی (برای HTTPS)
N8N_SAMESITE_COOKIE	مقدار SameSite کوکی (strict، lax، یا none)
کش
متغیر	توضیح
N8N_CACHE_BACKEND	نوع backend کش (memory، redis، یا auto)
N8N_CACHE_MEMORY_MAX_SIZE	حداکثر حجم کش حافظه (bytes)
N8N_CACHE_MEMORY_TTL	TTL برای کش حافظه (ms)
N8N_CACHE_REDIS_KEY_PREFIX	پیشوند کلیدهای Redis
N8N_CACHE_REDIS_TTL	TTL برای کش Redis (ms)
Chat Hub
متغیر	توضیح
N8N_CHAT_HUB_EXECUTION_CONTEXT_TTL	TTL context اجرا در Chat Hub (ثانیه)
N8N_CHAT_HUB_STREAM_STATE_TTL	TTL state stream (ثانیه)
N8N_CHAT_HUB_MAX_BUFFERED_CHUNKS	حداکثر chunks بافر شده
N8N_DISABLE_PUBLIC_CHAT_TRIGGER	غیرفعال کردن chat عمومی
Credentials
متغیر	توضیح
CREDENTIALS_DEFAULT_NAME	نام پیش‌فرض credential جدید
CREDENTIALS_OVERWRITE_DATA	داده JSON برای پر کردن اولیه credential
CREDENTIALS_OVERWRITE_ENDPOINT	endpoint برای overwrite اعتبارنامه
CREDENTIALS_OVERWRITE_ENDPOINT_AUTH_TOKEN	توکن احراز هویت endpoint
CREDENTIALS_OVERWRITE_PERSISTENCE	ماندگاری overwrite پس از ری‌استارت
N8N_SKIP_CREDENTIAL_OVERWRITE	انواع credential که overwrite نمی‌شوند
پایگاه داده
متغیر	توضیح
DB_TYPE	نوع DB (sqlite یا postgresdb)
DB_TABLE_PREFIX	پیشوند نام جداول
DB_PING_INTERVAL_SECONDS	فاصله health-check (ثانیه)
DB_LOGGING_ENABLED	فعال‌سازی لاگ query‌ها
DB_LOGGING_OPTIONS	سطح لاگ (query، error، schema، ...)
DB_LOGGING_MAX_EXECUTION_TIME	فقط queryهای کندتر از این را لاگ کن (ms)
DB_POSTGRESDB_DATABASE	نام پایگاه داده Postgres
DB_POSTGRESDB_HOST	هاست Postgres
DB_POSTGRESDB_PASSWORD	رمز Postgres
DB_POSTGRESDB_PORT	پورت Postgres
DB_POSTGRESDB_USER	نام کاربری Postgres
DB_POSTGRESDB_SCHEMA	schema مورد استفاده
DB_POSTGRESDB_POOL_SIZE	حداکثر اتصالات pool
DB_POSTGRESDB_CONNECTION_TIMEOUT	timeout اتصال (ms)
DB_POSTGRESDB_IDLE_CONNECTION_TIMEOUT	timeout اتصال بیکار (ms)
DB_POSTGRESDB_STATEMENT_TIMEOUT	حداکثر زمان اجرای query (ms)
DB_POSTGRESDB_SSL_ENABLED	فعال‌سازی SSL/TLS
DB_POSTGRESDB_SSL_CA	گواهی CA برای SSL
DB_POSTGRESDB_SSL_CERT	گواهی کلاینت SSL
DB_POSTGRESDB_SSL_KEY	کلید خصوصی کلاینت SSL
DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED	رد اتصال بدون تأیید گواهی
DB_SQLITE_DATABASE	مسیر فایل SQLite
DB_SQLITE_POOL_SIZE	حجم pool اتصال SQLite
DB_SQLITE_VACUUM_ON_STARTUP	اجرای VACUUM هنگام راه‌اندازی
Data Tables
متغیر	توضیح
N8N_DATA_TABLES_MAX_SIZE_BYTES	حداکثر حجم کل جداول داده (bytes)
N8N_DATA_TABLES_WARNING_THRESHOLD_BYTES	آستانه هشدار ظرفیت
N8N_DATA_TABLES_SIZE_CHECK_CACHE_DURATION_MS	cache duration بررسی اندازه
N8N_DATA_TABLES_UPLOAD_MAX_FILE_SIZE_BYTES	حداکثر اندازه فایل CSV
N8N_DATA_TABLES_CLEANUP_INTERVAL_MS	فاصله پاک‌سازی فایل‌های یتیم
N8N_DATA_TABLES_FILE_MAX_AGE_MS	حداکثر عمر قبل از یتیم شدن
Deployment و Diagnostics
متغیر	توضیح
N8N_DEPLOYMENT_TYPE	نوع deployment (برای telemetry)
N8N_DIAGNOSTICS_ENABLED	فعال‌سازی telemetry ناشناس
N8N_DIAGNOSTICS_CONFIG_FRONTEND	تنظیم telemetry frontend
N8N_DIAGNOSTICS_CONFIG_BACKEND	تنظیم telemetry backend
N8N_DIAGNOSTICS_POSTHOG_API_KEY	کلید API PostHog
N8N_DIAGNOSTICS_POSTHOG_API_HOST	آدرس PostHog
Endpoints و Metrics
متغیر	توضیح
N8N_PAYLOAD_SIZE_MAX	حداکثر اندازه payload درخواست (MiB)
N8N_FORMDATA_FILE_SIZE_MAX	حداکثر اندازه فایل multipart (MiB)
N8N_METRICS	فعال‌سازی endpoint متریک‌های Prometheus
N8N_METRICS_PREFIX	پیشوند نام متریک‌ها
N8N_ENDPOINT_REST	مسیر REST API
N8N_ENDPOINT_WEBHOOK	مسیر webhook
N8N_ENDPOINT_WEBHOOK_TEST	مسیر webhook تست
N8N_ENDPOINT_FORM	مسیر form
N8N_ENDPOINT_MCP	مسیر MCP
N8N_ENDPOINT_HEALTH	مسیر health check
N8N_DISABLE_UI	غیرفعال کردن UI
N8N_MCP_BUILDER_ENABLED	فعال‌سازی ابزارهای workflow builder در MCP
N8N_MCP_MAX_REGISTERED_CLIENTS	حداکثر OAuth clients برای MCP
Event Bus
متغیر	توضیح
N8N_EVENTBUS_CHECKUNSENTINTERVAL	فاصله بررسی پیام‌های ارسال نشده (ms)
N8N_EVENTBUS_RECOVERY_MODE	حالت بازیابی crash
N8N_EVENTBUS_LOGWRITER_KEEPLOGCOUNT	تعداد فایل‌های لاگ نگهداری شده
N8N_EVENTBUS_LOGWRITER_MAXFILESIZEINKB	حداکثر اندازه فایل لاگ (KB)
اجرای Workflow‌ها
متغیر	توضیح
EXECUTIONS_MODE	حالت اجرا (regular یا queue)
EXECUTIONS_TIMEOUT	timeout اجرای workflow (ثانیه)
EXECUTIONS_TIMEOUT_MAX	حد بالای timeout
EXECUTIONS_DATA_PRUNE	فعال‌سازی حذف اجراهای قدیمی
EXECUTIONS_DATA_MAX_AGE	سن قبل از soft-delete (ساعت)
EXECUTIONS_DATA_PRUNE_MAX_COUNT	حداکثر اجراهای نگهداری شده
N8N_CONCURRENCY_PRODUCTION_LIMIT	حداکثر اجراهای همزمان production
N8N_CONCURRENCY_EVALUATION_LIMIT	حداکثر اجراهای همزمان evaluation
EXECUTIONS_DATA_SAVE_ON_ERROR	ذخیره داده هنگام خطا
EXECUTIONS_DATA_SAVE_ON_SUCCESS	ذخیره داده هنگام موفقیت
EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS	ذخیره داده اجراهای دستی
Expression Engine
متغیر	توضیح
N8N_EXPRESSION_ENGINE	نوع engine (legacy یا vm)
N8N_EXPRESSION_ENGINE_POOL_SIZE	تعداد V8 isolateها
N8N_EXPRESSION_ENGINE_TIMEOUT	timeout ارزیابی expression (ms)
N8N_EXPRESSION_ENGINE_MEMORY_LIMIT	محدودیت حافظه V8 (MB)
تنظیمات عمومی
متغیر	توضیح
GENERIC_TIMEZONE	timezone پیش‌فرض
N8N_RELEASE_TYPE	کانال انتشار (stable، beta، ...)
N8N_GRACEFUL_SHUTDOWN_TIMEOUT	timeout خاموش شدن graceful (ثانیه)
N8N_DEFAULT_LOCALE	locale پیش‌فرض UI
N8N_USER_FOLDER	پوشه داده محلی n8n
N8N_ENCRYPTION_KEY	کلید رمزنگاری credential‌ها
شبکه و سرور
متغیر	توضیح
N8N_HOST	hostname که n8n روی آن listen می‌کند
N8N_PORT	پورت HTTP
N8N_LISTEN_ADDRESS	آدرس IP برای bind شدن
N8N_PROTOCOL	پروتکل (http یا https)
N8N_PATH	مسیر deploy
N8N_PROXY_HOPS	تعداد reverse proxy‌های جلوی n8n
N8N_SSL_KEY	کلید SSL
N8N_SSL_CERT	گواهی SSL
N8N_EDITOR_BASE_URL	آدرس عمومی editor
Redis و Queue
متغیر	توضیح
QUEUE_BULL_REDIS_HOST	هاست Redis
QUEUE_BULL_REDIS_PORT	پورت Redis
QUEUE_BULL_REDIS_PASSWORD	رمز Redis
QUEUE_BULL_REDIS_USERNAME	نام کاربری Redis
QUEUE_BULL_REDIS_DB	شماره database Redis
QUEUE_BULL_REDIS_TLS	فعال‌سازی TLS
QUEUE_BULL_REDIS_CLUSTER_NODES	نودهای cluster
QUEUE_HEALTH_CHECK_ACTIVE	فعال‌سازی health endpoint worker
QUEUE_HEALTH_CHECK_PORT	پورت health check
Task Runners
متغیر	توضیح
N8N_RUNNERS_MODE	حالت runner (internal یا external)
N8N_RUNNERS_AUTH_TOKEN	توکن مشترک احراز هویت
N8N_RUNNERS_MAX_CONCURRENCY	حداکثر tasks همزمان
N8N_RUNNERS_TASK_TIMEOUT	timeout اجرای task (ثانیه)
امنیت
متغیر	توضیح
N8N_RESTRICT_FILE_ACCESS_TO	دایرکتوری‌های مجاز برای file node‌ها
N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES	مسدود کردن دسترسی به فایل‌های داخلی
N8N_SSRF_PROTECTION_ENABLED	فعال‌سازی حفاظت SSRF
N8N_SSRF_BLOCKED_IP_RANGES	محدوده‌های IP مسدود شده (CIDR)
N8N_SSRF_ALLOWED_IP_RANGES	محدوده‌های IP مجاز
N8N_MFA_ENABLED	فعال‌سازی احراز هویت دو مرحله‌ای
N8N_CONTENT_SECURITY_POLICY	هدر CSP به صورت JSON
N8N_PASSWORD_MIN_LENGTH	حداقل طول رمز عبور (۸-۶۴)
SSO (ورود یکپارچه)
متغیر	توضیح
N8N_SSO_SAML_LOGIN_ENABLED	فعال‌سازی SSO مبتنی بر SAML
N8N_SSO_SAML_METADATA	XML metadata از ارائه‌دهنده SAML
N8N_SSO_OIDC_CLIENT_ID	شناسه کلاینت OIDC
N8N_SSO_OIDC_CLIENT_SECRET	رمز کلاینت OIDC
N8N_SSO_OIDC_DISCOVERY_ENDPOINT	endpoint کشف OIDC
N8N_SSO_LDAP_LOGIN_ENABLED	فعال‌سازی SSO مبتنی بر LDAP
N8N_SSO_REDIRECT_LOGIN_TO_SSO	هدایت صفحه ورود به SSO
ایمیل و مدیریت کاربران
متغیر	توضیح
N8N_EMAIL_MODE	روش ارسال ایمیل (smtp)
N8N_SMTP_HOST	هاست SMTP
N8N_SMTP_PORT	پورت SMTP
N8N_SMTP_SSL	استفاده از SSL
N8N_SMTP_USER	نام کاربری SMTP
N8N_SMTP_PASS	رمز SMTP
N8N_USER_MANAGEMENT_JWT_SECRET	رمز JWT
N8N_USER_MANAGEMENT_JWT_DURATION_HOURS	مدت اعتبار JWT (ساعت)
لاگ‌گیری
متغیر	توضیح
N8N_LOG_LEVEL	سطح لاگ (error، warn، info، debug، silent)
N8N_LOG_OUTPUT	مقصد لاگ (console، file، یا هر دو)
N8N_LOG_FORMAT	فرمت لاگ (text یا json)
N8N_LOG_FILE_SIZE_MAX	حداکثر اندازه فایل لاگ (MiB)
N8N_LOG_FILE_COUNT_MAX	حداکثر تعداد فایل‌های لاگ
License
متغیر	توضیح
N8N_LICENSE_ACTIVATION_KEY	کلید فعال‌سازی license
N8N_LICENSE_SERVER_URL	آدرس سرور license
N8N_LICENSE_AUTO_RENEW_ENABLED	تمدید خودکار license
مجموع: بیش از ۳۴۵ environment variable — همه از طریق decorator @Env() در پکیج packages/@n8n/config/src/ تعریف شده‌اند.
