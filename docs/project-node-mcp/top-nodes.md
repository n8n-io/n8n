# Top 50 node integrations

Marked off items already exist in mcp registry

Ranked by insertions. Excludes triggers, generic/common nodes, and
`@n8n/n8n-nodes-langchain/*` nodes.


Complexity is assigned from the most complex operation in the default node
version:

- **Complex** — an operation has a `resourceMapper`, more than one dynamic
  parameter/resource locator, or a dependency chain between dynamic parameters.
- **Medium** — dynamic values exist, but each operation has at most one
  independent resource locator or load-options field and no resource mapper.
- **Easy** — no dynamic input fields.
- **Unknown** — the external package schema is not available in this checkout.

1. Google Sheets — `n8n-nodes-base.googleSheets` (3,690,801) — **Complex**
2. Gmail — `n8n-nodes-base.gmail` (2,036,433) — **Medium**
3. Telegram — `n8n-nodes-base.telegram` (1,714,858) — **Easy**
4. Google Drive — `n8n-nodes-base.googleDrive` (1,118,065) — **Complex**
5. ~~Airtable — `n8n-nodes-base.airtable` (585,984)~~ — **Complex**
6. WhatsApp — `n8n-nodes-base.whatsApp` (516,699) — **Medium**
7. Supabase — `n8n-nodes-base.supabase` (416,828) — **Complex**
8. Slack — `n8n-nodes-base.slack` (387,487) — **Complex**
9. Google Docs — `n8n-nodes-base.googleDocs` (303,878) — **Complex**
10. ~~Notion — `n8n-nodes-base.notion` (272,999)~~ — **Complex**
11. Send Email — `n8n-nodes-base.emailSend` (255,058) — **Easy**
12. Google Calendar — `n8n-nodes-base.googleCalendar` (238,392) — **Complex**
13. Microsoft Outlook — `n8n-nodes-base.microsoftOutlook` (218,846) — **Complex**
14. PostgreSQL — `n8n-nodes-base.postgres` (200,376) — **Complex**
15. Microsoft Excel — `n8n-nodes-base.microsoftExcel` (189,512) — **Complex**
16. Discord — `n8n-nodes-base.discord` (130,485) — **Complex**
17. IMAP Email — `n8n-nodes-base.emailReadImap` (115,655) — **Easy**
18. ~~Apify — `@apify/n8n-nodes-apify.apify` (104,081)~~ — **Unknown**
19. YouTube — `n8n-nodes-base.youTube` (101,014) — **Complex**
20. HubSpot — `n8n-nodes-base.hubspot` (99,409) — **Complex**
21. Twilio — `n8n-nodes-base.twilio` (98,094) — **Easy**
22. Microsoft OneDrive — `n8n-nodes-base.microsoftOneDrive` (97,656) — **Medium**
23. Facebook Graph API — `n8n-nodes-base.facebookGraphApi` (91,174) — **Easy**
24. LinkedIn — `n8n-nodes-base.linkedIn` (79,336) — **Medium**
25. Microsoft Teams — `n8n-nodes-base.microsoftTeams` (68,561) — **Complex**
26. MySQL — `n8n-nodes-base.mySql` (54,757) — **Complex**
27. ClickUp — `n8n-nodes-base.clickUp` (53,769) — **Complex**
28. Microsoft SharePoint — `n8n-nodes-base.microsoftSharePoint` (52,853) — **Complex**
29. ElevenLabs — `@elevenlabs/n8n-nodes-elevenlabs.elevenLabs` (52,565) — **Unknown**
30. Salesforce — `n8n-nodes-base.salesforce` (51,011) — **Complex**
31. X (Twitter) — `n8n-nodes-base.twitter` (50,590) — **Complex**
32. Redis — `n8n-nodes-base.redis` (49,710) — **Easy**
33. OpenWeatherMap — `n8n-nodes-base.openWeatherMap` (49,329) — **Easy**
34. Perplexity — `n8n-nodes-base.perplexity` (48,142) — **Medium**
35. ~~Jira — `n8n-nodes-base.jira` (45,581)~~ — **Complex**
36. WordPress — `n8n-nodes-base.wordpress` (40,101) — **Complex**
37. ~~monday.com — `n8n-nodes-base.mondayCom` (39,490)~~ — **Complex**
38. Pipedrive — `n8n-nodes-base.pipedrive` (38,089) — **Complex**
39. Dropbox — `n8n-nodes-base.dropbox` (38,013) — **Easy**
40. Firecrawl — `@mendable/n8n-nodes-firecrawl.firecrawl` (35,005) — **Unknown**
41. Google Chat — `n8n-nodes-base.googleChat` (31,891) — **Medium**
42. MongoDB — `n8n-nodes-base.mongoDb` (31,399) — **Easy**
43. GitHub — `n8n-nodes-base.github` (31,160) — **Complex**
44. Shopify — `n8n-nodes-base.shopify` (30,995) — **Complex**
45. Tavily — `@tavily/n8n-nodes-tavily.tavily` (30,253) — **Unknown**
46. GoHighLevel — `n8n-nodes-base.highLevel` (29,913) — **Complex**
47. WhatsAble — `n8n-nodes-whatsable.whatsAble` (29,313) — **Unknown**
48. Hacker News — `n8n-nodes-base.hackerNews` (28,625) — **Easy**
49. Trello — `n8n-nodes-base.trello` (27,224) — **Medium**
50. Reddit — `n8n-nodes-base.reddit` (25,655) — **Easy**

# Top 50 node tool integrations

Only service-specific nodes whose type name contains `Tool`, ranked by insertions.
Excludes generic tools such as HTTP Request, Date & Time, and Data Table, plus
`@n8n/n8n-nodes-langchain/*` nodes. Generated `Tool` variants inherit the base
node's input schema. `HitlTool` variants are classified from their narrowed
send-and-wait schema.

1. Google Sheets Tool — `n8n-nodes-base.googleSheetsTool` (1,095,161) — **Complex**
2. Google Calendar Tool — `n8n-nodes-base.googleCalendarTool` (596,378) — **Complex**
3. Gmail Tool — `n8n-nodes-base.gmailTool` (574,190) — **Medium**
4. Google Drive Tool — `n8n-nodes-base.googleDriveTool` (125,391) — **Complex**
5. Google Docs Tool — `n8n-nodes-base.googleDocsTool` (122,206) — **Complex**
6. ~~Airtable Tool — `n8n-nodes-base.airtableTool` (110,794)~~ — **Complex**
7. Supabase Tool — `n8n-nodes-base.supabaseTool` (84,544) — **Complex**
8. Gmail HITL Tool — `n8n-nodes-base.gmailHitlTool` (79,408) — **Easy**
9. Telegram Tool — `n8n-nodes-base.telegramTool` (78,753) — **Easy**
10. WhatsApp Tool — `n8n-nodes-base.whatsAppTool` (65,749) — **Medium**
11. Microsoft Outlook Tool — `n8n-nodes-base.microsoftOutlookTool` (56,935) — **Complex**
12. ~~Notion Tool — `n8n-nodes-base.notionTool` (53,381)~~ — **Complex**
13. OpenWeatherMap Tool — `n8n-nodes-base.openWeatherMapTool` (50,245) — **Easy**
14. Microsoft Excel Tool — `n8n-nodes-base.microsoftExcelTool` (47,157) — **Complex**
15. Perplexity Tool — `n8n-nodes-base.perplexityTool` (42,162) — **Medium**
16. LinkedIn Tool — `n8n-nodes-base.linkedInTool` (35,711) — **Medium**
17. Slack Tool — `n8n-nodes-base.slackTool` (31,014) — **Complex**
18. PostgreSQL Tool — `n8n-nodes-base.postgresTool` (30,559) — **Complex**
19. Tavily Tool — `@tavily/n8n-nodes-tavily.tavilyTool` (28,414) — **Unknown**
20. SerpApi Tool — `n8n-nodes-serpapi.serpApiTool` (21,823) — **Unknown**
21. MySQL Tool — `n8n-nodes-base.mySqlTool` (20,094) — **Complex**
22. YouTube Tool — `n8n-nodes-base.youTubeTool` (20,060) — **Complex**
23. Send Email Tool — `n8n-nodes-base.emailSendTool` (19,252) — **Easy**
24. Google Contacts Tool — `n8n-nodes-base.googleContactsTool` (17,783) — **Medium**
25. ~~Jira Tool — `n8n-nodes-base.jiraTool` (17,653)~~ — **Complex**
26. Marketstack Tool — `n8n-nodes-base.marketstackTool` (16,259) — **Easy**
27. Google Tasks Tool — `n8n-nodes-base.googleTasksTool` (16,032) — **Easy**
28. Shopify Tool — `n8n-nodes-base.shopifyTool` (14,438) — **Complex**
29. HubSpot Tool — `n8n-nodes-base.hubspotTool` (13,729) — **Complex**
30. Telegram HITL Tool — `n8n-nodes-base.telegramHitlTool` (13,256) — **Easy**
31. Philips Hue Tool — `n8n-nodes-base.philipsHueTool` (12,871) — **Medium**
32. GitHub Tool — `n8n-nodes-base.githubTool` (12,465) — **Complex**
33. Microsoft OneDrive Tool — `n8n-nodes-base.microsoftOneDriveTool` (12,260) — **Medium**
34. Facebook Graph API Tool — `n8n-nodes-base.facebookGraphApiTool` (12,235) — **Easy**
35. Discord Tool — `n8n-nodes-base.discordTool` (11,885) — **Complex**
36. Twilio Tool — `n8n-nodes-base.twilioTool` (11,474) — **Easy**
37. WhatsApp HITL Tool — `n8n-nodes-base.whatsAppHitlTool` (10,629) — **Medium**
38. Microsoft Teams Tool — `n8n-nodes-base.microsoftTeamsTool` (10,300) — **Complex**
39. ClickUp Tool — `n8n-nodes-base.clickUpTool` (9,200) — **Complex**
40. Airtop Tool — `n8n-nodes-base.airtopTool` (8,969) — **Complex**
41. X (Twitter) Tool — `n8n-nodes-base.twitterTool` (8,056) — **Complex**
42. Spotify Tool — `n8n-nodes-base.spotifyTool` (7,891) — **Easy**
43. MongoDB Tool — `n8n-nodes-base.mongoDbTool` (7,818) — **Easy**
44. IMAP Email Tool — `n8n-nodes-base.emailReadImapTool` (7,752) — **Easy**
45. Google Chat Tool — `n8n-nodes-base.googleChatTool` (7,616) — **Medium**
46. Hacker News Tool — `n8n-nodes-base.hackerNewsTool` (7,567) — **Easy**
47. Pushover Tool — `n8n-nodes-base.pushoverTool` (7,256) — **Medium**
48. Salesforce Tool — `n8n-nodes-base.salesforceTool` (7,199) — **Complex**
49. Microsoft SharePoint Tool — `n8n-nodes-base.microsoftSharePointTool` (7,089) — **Complex**
50. Send Email HITL Tool — `n8n-nodes-base.emailSendHitlTool` (7,061) — **Easy**