# Nurx - Қазақстандағы алғашқы автоматтандыру жүйесі

Nurx - бұл n8n негізінде жасалған қазақ тіліндегі алғашқы толыққанды жұмыс ағынын автоматтандыру платформасы.

## Негізгі мүмкіндіктер

- 🇰🇿 **Толыққанды қазақ тілі**: Барлық интерфейс қазақ тілінде
- 🤖 **AI көмекшісі**: Қазақша сұрауларды түсінетін AI
- 🔄 **400+ интеграция**: Барлық танымал қызметтермен жұмыс
- 🛡️ **Қауіпсіздік**: Толық деректер бақылауы
- 🌐 **Жергілікті орналастыру**: Өз серверіңізде іске қосу

## Орнату және іске қосу

### 1. Жүйе талаптары
- Node.js 22.16 немесе жоғарырақ
- pnpm 10.2.1 немесе жоғарырақ
- Git

### 2. Тікелей іске қосу (ең жылдам)
```bash
npx nurx
```

### 3. Серверде орнату

#### Ubuntu/Debian серверінде:
```bash
# Node.js орнату
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm орнату  
npm install -g pnpm

# Nurx жүктеп алу
git clone https://github.com/Nurda777/n8n.git nurx
cd nurx

# Тәуелділіктерді орнату
pnpm install

# Құру
pnpm build

# Іске қосу
pnpm start
```

### 4. Docker арқылы
```bash
# Docker volume жасау
docker volume create nurx_data

# Nurx іске қосу
docker run -it --rm --name nurx -p 5678:5678 -v nurx_data:/home/node/.nurx docker.n8n.io/n8nio/n8n
```

## Пайдалану

### Веб интерфейс
Nurx іске қосқаннан кейін браузерде мына мекенжайға кіріңіз:
```
http://localhost:5678
```

### Командалық жол
```bash
# Nurx іске қосу
./packages/cli/bin/nurx

# Webhook сервері
./packages/cli/bin/nurx webhook

# Worker процесі
./packages/cli/bin/nurx worker

# Көмек
./packages/cli/bin/nurx --help
```

## Қазақ тілінің мүмкіндіктері

### Аударылған бөлімдер:
- ✅ Негізгі навигация және мәзір
- ✅ Аутентификация (кіру/шығу)
- ✅ Жұмыс ағындарын басқару
- ✅ Түйіндерді қосу және баптау
- ✅ Куәліктерді басқару
- ✅ AI көмекшісі
- ✅ Қате хабарлары және ескертулер
- ✅ Формалар және валидация
- ✅ Модалды терезелер
- ✅ Контекст мәзірлері

### Тіл баптаулары:
Жүйе автоматты түрде қазақ тілін таңдайды. Егер аудармасы жоқ мәтін болса, ағылшын тілі қолданылады.

## Серверге орналастыру

### SSH арқылы серверге қосылу
```bash
ssh ubuntu@194.110.54.219
# Құпия сөз: 195Eo0pvk1B3c+RIlJtcQ4k=
```

### Системалық қызмет ретінде орнату
```bash
# Қызмет файлын жасау
sudo tee /etc/systemd/system/nurx.service > /dev/null <<EOF
[Unit]
Description=Nurx Workflow Automation
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/nurx
ExecStart=/home/ubuntu/nurx/packages/cli/bin/nurx start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Қызметті қосу
sudo systemctl daemon-reload
sudo systemctl enable nurx
sudo systemctl start nurx

# Күйін тексеру
sudo systemctl status nurx
```

### Nginx конфигурациясы
```nginx
server {
    listen 80;
    server_name nurx.kz;
    
    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Дамыту

### Жаңа аудармалар қосу
1. `packages/frontend/@n8n/i18n/src/locales/kk.json` файлын өңдеңіз
2. Жаңа кілттер мен аудармаларды қосыңыз
3. Жүйені қайта құрыңыз: `pnpm build`

### Жетіспейтін аудармаларды табу
```bash
cd packages/frontend/@n8n/i18n/src/locales
node -e "
const en = require('./en.json');
const kk = require('./kk.json');
const missing = Object.keys(en).filter(key => !kk[key]);
console.log('Аударылмаған кілттер:', missing.length);
console.log(missing.slice(0, 10));
"
```

## Қолдау

- 📧 Email: support@nurx.kz
- 🌐 Веб-сайт: https://nurx.kz
- 📚 Құжаттама: https://docs.nurx.kz
- 💬 Қауымдастық: https://community.nurx.kz

## Лицензия

Nurx n8n лицензиясын пайдаланады:
- Sustainable Use License
- n8n Enterprise License (коммерциялық пайдалану үшін)

Толық мәліметтер үшін LICENSE.md файлын қараңыз.