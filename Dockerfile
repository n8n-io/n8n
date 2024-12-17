# تحديد إصدار Node.js المطلوب
FROM node:20.15

# تحديد مجلد العمل
WORKDIR /usr/src/app

# نسخ الملفات الضرورية
COPY package*.json ./

# تثبيت الحزم
RUN npm install

# نسخ باقي المشروع
COPY . .

# تشغيل التطبيق
CMD ["npx", "n8n", "start"]
