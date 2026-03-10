# Test Prompts — Multi-Workflow Generation

Natural user prompts that should result in the agent creating multiple workflows and data tables.

---

## 1. Email Command Center

> I'm drowning in email. Here's what I need: watch my Gmail inbox continuously and use OpenAI to classify every incoming email into urgent, actionable, informational, or spam. Track all of them in a table with the sender, subject, category, a one-line AI summary, and when it arrived. For anything marked urgent, immediately block 30 minutes on my Google Calendar titled "URGENT: [subject]" and send me a separate Gmail alert with the AI summary so I see it right away. Then at 6pm every day, pull everything from today's table, have OpenAI write a proper digest grouped by category with the most important items first, and email that to me. I also want a weekly report every Friday at 5pm that shows trends — like which senders generate the most urgent emails and whether my urgent volume is going up or down compared to last week.

---

## 2. Meeting Intelligence System

> I want to completely automate my meeting prep and follow-up. Every morning at 7:30am, pull all of today's meetings from Google Calendar, and for each one: look up the attendees' names, check if I have any previous meeting notes about them in a table, and send all that context to OpenAI to generate a prep brief (talking points, questions to ask, things to remember from last time). Email me all the briefs in one nicely formatted message. Then after each meeting ends (check calendar every 15 min for recently ended events), send me a Gmail asking "How did the meeting with [attendees] go? Reply with your notes." When I reply, save my notes to the table linked to that calendar event and attendees. At the end of each week, have OpenAI analyze all my meeting notes and generate a "weekly themes" summary — what topics kept coming up, any action items I mentioned, people I should follow up with — and email that to me on Friday evening.

---

## 3. Content Factory

> I run a newsletter and I'm always behind on content. Set this up for me: I want a table tracking all my content ideas with status tracking. When I send an email to myself with subject starting with "IDEA:" — grab the body, use OpenAI to expand it into a structured outline with title, hook, 3-5 key points, and a suggested angle, then save it to the table as "raw". Every morning, pick the oldest "raw" idea, have OpenAI write a full 800-word first draft, then run it through OpenAI again with a different prompt to act as an editor and suggest improvements. Save both the draft and the editorial feedback back to the table and update the status to "drafted". Email me the draft with the editor's notes inline. Keep a separate stats table that tracks how many ideas I capture per week, how many get drafted, and my average time from idea to draft.  I should also be able to trigger something manually with an idea ID to fast-track it straight to the drafting step, maybe via n8n webhooks and some nice html?

---

## 4. Smart Scheduling + Relationship Tracker

> People email me constantly asking to meet and I lose track. Here's what I want: when I forward an email to a Gmail label called "Schedule This", have OpenAI parse out who wants to meet, when they're suggesting, how long, and what about. Check my Google Calendar for conflicts. If I'm free, book it and reply to the sender confirming with the calendar link. If I'm busy, find my next 3 available 30-minute slots in the next 5 business days and reply suggesting those. Track every scheduling interaction in a table — who requested, what was proposed, whether it was auto-booked or I had to suggest alternatives, and the final outcome. Keep a separate contacts table that logs everyone I've scheduled with, how many times we've met, and when we last met. Every Sunday at 8pm, pull my upcoming week from Google Calendar, cross-reference with my contacts table to add context about each person, have OpenAI generate a week-ahead briefing with time blocks for focus work between meetings, and email me the overview. Also flag if I'm meeting someone for the first time — I want to know that.

---

## 5. Customer Success Dashboard

> We handle customer feedback through a Gmail label and I need a proper system around it. When an email hits the "Customer Feedback" label, run it through OpenAI for sentiment analysis (positive/neutral/negative) and extract the core issue in one sentence, then classify priority as critical, high, medium, or low based on sentiment + whether they mention words like "cancel", "broken", "deadline". Store everything in a feedback table with the customer email, original message, sentiment score, priority, extracted issue, and resolution status. Every morning at 9am, query all unresolved critical and high priority items, have OpenAI group them by theme and write an executive summary, and email it to me with a count of new vs. carried-over issues. I also want to be able to trigger a response workflow — give it a customer email address and it should pull their full feedback history from the table, have OpenAI analyze the relationship trajectory (are they getting happier or angrier over time?), draft a personalized response that acknowledges their history, and send it via Gmail. Track that the response was sent and update the feedback status. End of month, generate a trends report: total feedback volume, sentiment distribution, average resolution time, top 5 issues by frequency, and email it to me.

---

## 6. Personal CRM + Networking Autopilot

> Build me a personal CRM that mostly runs itself. Track every person I interact with in a contacts table: name, email, company, how we met, last contact date, relationship strength (hot/warm/cold), and notes. Populate it automatically — when I get a new email from someone not in the table, use OpenAI to extract their name and company from the email signature, add them as a new contact with strength "warm" and how_we_met as "email". When I have a Google Calendar meeting with someone, update their last_contact date and bump strength to "hot". Every day, decay relationship strength — anyone I haven't contacted in 14 days goes from hot to warm, 30 days from warm to cold. Every Monday morning, email me my "re-engage" list: everyone who dropped to cold in the last week, with OpenAI suggesting a personalized one-line reach-out message for each based on our last interaction. Also once a month, email me network analytics: how many new contacts, which relationships are strongest, who I'm neglecting, and any clusters (like "you met 5 people from Company X this month").

---

## 7. Hiring Pipeline Tracker (Google Sheets + Gmail + OpenAI)

> I'm hiring for 3 roles and tracking everything manually — it's a mess. Build me this: a Google Sheet called "Hiring Pipeline" with columns for candidate name, email, role applied for, stage (applied/phone-screen/interview/offer/rejected), interviewer notes, AI assessment, and last updated date. When I forward a resume email to a Gmail label called "New Applicant", extract the candidate's name and email from the message, use OpenAI to analyze the email body and any text content as a resume — score them 1-10 for relevance to common software roles and write a 2-sentence assessment. Add them to the sheet with stage "applied". I also want a sub-workflow I can call with a candidate email and new stage — it updates their row in the sheet, timestamps it, and if the new stage is "rejected", uses OpenAI to draft a polite rejection email personalized with their name and role, then sends it via Gmail. If the stage is "offer", draft a congratulations email instead. Every Monday morning, pull all candidates from the sheet grouped by role and stage, have OpenAI write a pipeline summary (how many at each stage, who's been stuck longest, recommendations for who to move forward), and email it to me.

---

## 8. Project Time Tracker & Invoice Generator (Google Sheets + Google Calendar + OpenAI + Gmail)

> I freelance for multiple clients and I'm terrible at tracking time. Here's what I need: a Google Sheet called "Time Log" with columns for date, client, project, hours, description, and billable rate. Every evening at 7pm, pull all of today's Google Calendar events, filter out personal ones (anything without a client tag in the description), and for each work event calculate the duration and add a row to the sheet. Use OpenAI to generate a concise work description from the calendar event title and description. Keep a separate "Clients" sheet with client name, hourly rate, email, and payment terms. At the end of each month, build a sub-workflow that takes a client name, pulls all their time entries for the month from the Time Log sheet, calculates total hours and amount owed using their rate from the Clients sheet, has OpenAI format a professional invoice summary as an HTML email with line items, totals, and payment terms, then sends it via Gmail to the client's email. The main workflow should call this sub-workflow once for each active client. Also email me a monthly overview: total hours across all clients, revenue breakdown per client, and which client took the most time.

---

## 9. Event Coordination Hub (Google Calendar + Google Sheets + Gmail + OpenAI + Sub-workflows)

> I organize community meetups and the coordination is killing me. Build a system with these pieces: a master Google Sheet called "Events" tracking event name, date, venue, expected attendees, status, and notes. A second sheet called "RSVPs" with event name, attendee name, email, rsvp status, and dietary restrictions. Create a sub-workflow called "Send Event Email" that takes an event name, email list, and email type (invite/reminder/followup) — it pulls event details from the Events sheet, uses OpenAI to write an appropriate email for that type (invite should be exciting and include all details, reminder should be brief and urgent, followup should thank attendees and include a feedback link), then sends it via Gmail to each address on the list. The main orchestration workflow runs daily: for events 7 days out, call the sub-workflow with type "invite" for anyone in RSVPs with status "pending". For events 1 day out, call it with type "reminder" for anyone with status "confirmed". For events that happened yesterday, call it with type "followup" for confirmed attendees. When someone replies to an invite email (watch for replies in Gmail), use OpenAI to parse their response as yes/no/maybe and extract any dietary info, then update the RSVPs sheet. Every Sunday, generate a week-ahead brief: upcoming events, RSVP counts, any events with low turnout that need promotion.

---

## 10. Competitive Intelligence Tracker (Google Sheets + OpenAI + Gmail + Sub-workflows)

> I need to track what our competitors are doing and brief the team weekly. Set up a Google Sheet called "Intel Feed" with columns for competitor name, date, source URL, category (pricing/product/hiring/partnership/funding), raw snippet, AI analysis, and impact rating (high/medium/low). Create a sub-workflow called "Analyze Intel Item" — it takes a competitor name, a text snippet, and a source URL, then uses OpenAI to categorize it, write a 3-sentence analysis of what it means for us, rate the impact, and append the row to the Intel sheet. I want a main intake workflow: when I send an email to myself with subject starting with "INTEL:" followed by the competitor name, grab the email body as the snippet, call the Analyze Intel sub-workflow for each competitor mentioned. Also create a separate monitoring workflow that runs every morning — it reads a "Watchlist" sheet with competitor names and their key Google search terms, and for each one emails me any items from the Intel sheet added in the last 7 days that were rated high impact. Every Friday at 4pm, pull the full week's intel from the sheet, use OpenAI to write an executive competitive brief organized by competitor with the most important developments first, trend analysis, and suggested actions, then email it to a distribution list I keep in a "Team" sheet.

---

## 11. Knowledge Base Builder (Google Sheets + OpenAI + Gmail + Sub-workflows)

> Our team keeps asking the same questions and the answers are scattered everywhere. Build me a knowledge base system. Main sheet called "Knowledge Base" with columns: question, answer, category, author, created date, last updated, times accessed. Second sheet called "Pending Questions" with question, asker email, date asked, status. When someone emails a shared Gmail address with subject "Q:", add their question to Pending Questions. Create a sub-workflow called "Answer Question" — it takes a question, searches the Knowledge Base sheet for similar existing entries using OpenAI to compare semantic similarity, and if it finds a match (confidence > 80%), replies to the asker via Gmail with the existing answer and increments the access counter. If no match, it uses OpenAI to draft an answer based on any partially relevant entries, adds it to Pending Questions as "needs review", and emails me the question with the draft answer asking me to approve or edit. When I reply with "APPROVE" or an edited answer, another workflow picks that up, moves the Q&A to the Knowledge Base sheet, and sends the final answer to the original asker. Monthly stats workflow: email me the top 10 most accessed questions, any categories with growing question volume, and questions that have been pending for more than 3 days.
