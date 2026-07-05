# BolekFlow — automatyzacje i workflow dla Agenta Bolka

> **Status:** decyzja architektoniczna / plan.  
> To repo jest forkiem n8n przygotowywanym jako przyszła warstwa workflow, automatyzacji, webhooków i human-in-the-loop dla ekosystemu Agenta Bolka.

---

## 1. Czym jest BolekFlow

`BolekFlow` to przyszły system automatyzacji procesów wokół Bolka.

Docelowo może obsługiwać:

- webhooki,
- cykliczne workflow,
- integracje z zewnętrznymi usługami,
- przepływy mailowe,
- triage supportu,
- synchronizacje danych,
- human-in-the-loop approvals,
- powiadomienia,
- automatyzacje Polutka,
- powtarzalne procesy operacyjne.

BolekFlow ma wykonywać nudne, powtarzalne przepływy. BolekAI pozostaje mózgiem i decydentem.

---

## 2. Czym BolekFlow NIE jest

BolekFlow nie jest:

- głównym mózgiem Bolka,
- webowym czatem,
- bazą wiedzy/RAG,
- executor kodowania,
- miejscem na długoterminową pamięć Bolka,
- systemem, który może omijać approval gate Bolka.

BolekFlow może automatyzować procesy, ale decyzje ryzykowne powinny wracać do BolekAI i użytkownika.

---

## 3. Sieć repozytoriów Bolka

```txt
pawelekbyra/BolekAI
= mózg Bolka
= Cloudflare Worker
= Telegram bot
= D1 memory
= narzędzia
= Polutek ops
= approval gate
= OpenAI-compatible adapter dla UI

pawelekbyra/BolekCzat
= web UI Bolka
= fork LibreChat
= rozmowy, historia, auth, UX

pawelekbyra/BolekDev
= coding executor
= fork OpenHands / Agent Canvas
= branche, testy, commity, PR-y

pawelekbyra/BolekKB
= knowledge base / RAG
= fork AnythingLLM
= dokumenty, notatki, wiedza, źródła

pawelekbyra/BolekFlow
= workflow automation
= fork n8n
= automatyzacje, webhooki, integracje, human-in-the-loop
```

---

## 4. Docelowy przepływ

```txt
BolekCzat / Telegram
  ↓
BolekAI / Agent Bolek brain
  ↓
BolekFlow / workflow automation
  ↓
mail, Stripe, Clerk, Vercel, GitHub, Polutek ops, notifications
```

Przykład:

```txt
1. Mail przychodzi na support Polutka.
2. BolekFlow łapie webhook albo cyklicznie sprawdza skrzynkę.
3. BolekFlow robi prosty routing/normalizację danych.
4. BolekAI klasyfikuje sprawę i proponuje odpowiedź.
5. Użytkownik zatwierdza albo odrzuca.
6. BolekFlow wysyła odpowiedź albo tworzy follow-up task.
```

---

## 5. Przyszłe integracje z BolekAI

W przyszłości `BolekAI` może dostać narzędzia typu:

```txt
flow_run_workflow
flow_get_run_status
flow_cancel_run
flow_list_workflows
flow_trigger_webhook
```

BolekFlow może też wołać BolekAI przez bezpieczny endpoint, gdy workflow potrzebuje decyzji językowej lub agentowej.

Na tym etapie te narzędzia nie muszą istnieć.

---

## 6. Bezpieczeństwo

Zasady:

- BolekFlow nie może omijać approval gate w BolekAI.
- Mutujące akcje, takie jak refund, revoke patrona, deploy, merge, wysyłka maila albo zmiana ceny, powinny mieć jasny tryb zgody.
- BolekFlow powinien mieć minimalne uprawnienia do każdej usługi.
- Produkcyjne sekrety powinny być ograniczone tylko do workflow, które ich potrzebują.
- Sekrety nie powinny trafiać do BolekCzat ani BolekKB.
- Każdy krytyczny workflow powinien zostawiać audit trail.
- BolekFlow powinien raportować błędy do BolekAI/Telegram/BolekCzat zamiast cicho je ignorować.

---

## 7. Dobre pierwsze workflow

Kandydaci:

- dzienny briefing Polutka,
- support mail triage,
- powiadomienie o błędzie Vercel,
- przypomnienie o failed deployment,
- podsumowanie nowych issue/PR,
- pricing advisor input collector,
- monitor kosztów Mux/Cloudflare/Bunny,
- webhook z GitHuba do Bolka,
- weekly summary repo/Polutek.

Nie zaczynać od:

- automatycznego merge,
- automatycznego deploy produkcji,
- automatycznych refundów bez zgody,
- bezpośredniego dotykania baz produkcyjnych.

---

## 8. Kolejność prac

```txt
1. Zachować fork n8n i dodać dokumentację roli.
2. Uruchomić lokalnie przez Docker/npx.
3. Stworzyć testowy workflow bez sekretów.
4. Dodać jeden bezpieczny webhook do BolekAI.
5. Dodać human-in-the-loop approval dla mutujących akcji.
6. Dopiero potem łączyć z Polutkiem, mailem, GitHubem i Vercel.
```

---

## 9. Zasada nadrzędna

```txt
BolekAI myśli i decyduje.
BolekFlow automatyzuje procesy.
BolekKB przechowuje wiedzę.
BolekDev koduje.
BolekCzat pokazuje rozmowę.
```
