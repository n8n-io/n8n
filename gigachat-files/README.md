# GigaChat Files Collection

Эта папка содержит все файлы из проекта n8n, которые имеют отношение к интеграции GigaChat.

## 📁 Структура файлов

### 📄 Документация
- `README-GigaChat.md` - Основная документация по интеграции GigaChat с n8n

### 🔧 Credentials (Учетные данные)
- `packages/nodes-base/credentials/GigaChatApi.credentials.ts` - Основной файл credentials для GigaChat API
- `packages/nodes-base/credentials/index.ts.backup` - Резервная копия index.ts с экспортом GigaChat credentials
- `packages/@n8n/nodes-langchain/credentials/index.ts.backup` - Резервная копия index.ts для LangChain credentials

### 🎯 Основной GigaChat Node
- `packages/nodes-base/nodes/GigaChat/GigaChat.node.ts` - Основной узел GigaChat
- `packages/nodes-base/nodes/GigaChat/GigaChat.node.json` - Конфигурация узла
- `packages/nodes-base/nodes/GigaChat/GenericFunctions.ts` - Общие функции для GigaChat
- `packages/nodes-base/nodes/GigaChat/descriptions/ChatDescription.ts` - Описания для операций чата
- `packages/nodes-base/nodes/GigaChat/descriptions/index.ts` - Экспорт описаний
- `packages/nodes-base/nodes/GigaChat/ac21ee8f_GC-api-black-green-sphere.svg` - Иконка для основного GigaChat node

### 🔗 LangChain GigaChat Node
- `packages/@n8n/nodes-langchain/nodes/llms/LmChatGigaChat/LmChatGigaChat.node.ts` - LangChain интеграция GigaChat
- `packages/@n8n/nodes-langchain/nodes/llms/LmChatGigaChat/ac21ee8f_GC-api-black-green-sphere.svg` - Иконка для LangChain GigaChat node

### 🔄 Интеграционные файлы
- `packages/@n8n/nodes-langchain/nodes/agents/Agent/V2/AgentV2.node.ts` - Файл агента с поддержкой GigaChat

### 📦 Конфигурационные файлы
- `packages/nodes-base/package.json.backup` - Резервная копия package.json с зависимостями GigaChat
- `packages/@n8n/nodes-langchain/package.json.backup` - Резервная копия package.json для LangChain с зависимостями

## 📊 Статистика

**Всего файлов:** 15
**Основные компоненты:**
- ✅ Основной GigaChat Chat node
- ✅ GigaChat LangChain node  
- ✅ Система аутентификации (credentials)
- ✅ Иконки и графические ресурсы
- ✅ Документация
- ✅ Конфигурационные файлы

## 🚀 Использование

Эти файлы можно использовать для:
1. Переноса интеграции GigaChat в другой проект n8n
2. Создания резервной копии интеграции
3. Изучения структуры интеграции
4. Разработки аналогичных интеграций

## 🔍 Зависимости

Основные зависимости для работы GigaChat:
- `gigachat: ^0.0.14`
- `langchain-gigachat: ^0.0.11`

## 📝 Примечания

- Файлы с расширением `.backup` - это резервные копии файлов, которые содержат ссылки на GigaChat среди других компонентов
- Иконки находятся в двух местах для обеспечения работы как основного node, так и LangChain node
- Все файлы сохраняют оригинальную структуру каталогов для упрощения интеграции 