![橫幅圖片](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n - 面向技術團隊的安全工作流程自動化

n8n 是一個工作流程自動化平台，為技術團隊提供程式碼的靈活性和無程式碼的速度。擁有 400+ 整合、原生 AI 能力和 fair-code 授權，n8n 讓你能夠建立強大的自動化，同時保持對資料和部署的完全控制。

![n8n.io - 螢幕截圖](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-screenshot-readme.png)

## 核心能力

- **按需編寫程式碼**：編寫 JavaScript/Python，新增 npm 套件，或使用視覺化介面
- **AI 原生平台**：基於 LangChain 建構 AI agent 工作流程，使用你自己的資料和模型
- **完全控制**：使用我們的 fair-code 授權自行託管，或使用我們的[雲端服務](https://app.n8n.cloud/login)
- **企業就緒**：進階權限管理、SSO 和氣隙部署
- **活躍社群**：400+ 整合和 900+ 即用型[範本](https://n8n.io/workflows)

## 快速開始

使用 [npx](https://docs.n8n.io/hosting/installation/npm/) 即時體驗 n8n（需要 [Node.js](https://nodejs.org/en/)）：

```
npx n8n
```

或使用 [Docker](https://docs.n8n.io/hosting/installation/docker/) 部署：

```
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

在 http://localhost:5678 存取編輯器

## 資源

- 📚 [文件](https://docs.n8n.io)
- 🔧 [400+ 整合](https://n8n.io/integrations)
- 💡 [範例工作流程](https://n8n.io/workflows)
- 🤖 [AI 與 LangChain 指南](https://docs.n8n.io/advanced-ai/)
- 👥 [社群論壇](https://community.n8n.io)
- 📖 [社群教學](https://community.n8n.io/c/tutorials/28)

## 支援

需要幫助？我們的社群論壇是獲取支援和與其他使用者交流的地方：
[community.n8n.io](https://community.n8n.io)

## 授權條款

n8n 是 [fair-code](https://faircode.io) 專案，基於[永續使用授權條款](https://github.com/n8n-io/n8n/blob/master/LICENSE.md)和 [n8n 企業授權條款](https://github.com/n8n-io/n8n/blob/master/LICENSE_EE.md)分發。

- **原始碼可見**：原始碼始終可見
- **可自行託管**：可部署在任何地方
- **可擴展**：新增你自己的節點和功能

[企業授權](mailto:license@n8n.io)提供額外功能和支援。

有關授權模式的更多資訊，請參閱[文件](https://docs.n8n.io/sustainable-use-license/)。

## 貢獻

發現了 bug 🐛 或有功能想法 ✨？查看我們的[貢獻指南](https://github.com/n8n-io/n8n/blob/master/CONTRIBUTING.md)了解設定步驟和最佳實踐。

## 加入團隊

想要塑造自動化的未來？查看我們的[招募資訊](https://n8n.io/careers)並加入我們的團隊！

## n8n 是什麼意思？

**簡短回答：** 它代表 "nodemation"，發音為 n-eight-n。

**詳細回答：** "我經常被問到這個問題（比我想像的更頻繁），所以我決定最好在這裡回答。在為一個擁有免費網域名稱的專案尋找好名字時，我很快意識到所有我能想到的好名字都已經被佔用了。所以最後，我選擇了 nodemation。'node-' 的意思是它使用 Node-View 並且使用 Node.js，'-mation' 代表 'automation'（自動化），這正是這個專案要幫助實現的。然而，我不喜歡這個名字太長，而且我無法想像每次在 CLI 中都要輸入那麼長的東西。於是就有了 'n8n'。" - **Jan Oberhauser，n8n.io 創辦人兼 CEO**
