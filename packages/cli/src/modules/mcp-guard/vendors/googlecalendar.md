---
name: googlecalendar
hosts: www.googleapis.com
path_prefixes: /calendar/v3
passthrough_hosts: oauth2.googleapis.com
read_paths:
- ^/calendar/v3/freeBusy$
---
Service: Google Calendar API v3 (www.googleapis.com/calendar/v3).

Calls are HTTP requests. The tool name tells the kind: "read_..." (GET, or the freeBusy POST) and "write_..." (every other POST, PATCH, PUT and DELETE). The args are {path, query, body}. Code decides which calls are reads, not you. A write never reaches the real calendar, and the gym sends no invitation.

Real result shapes: an event has "id", "summary", "description", "location", "start" and "end" ({dateTime, timeZone} or {date} for an all-day event), "attendees" [{email, displayName, responseStatus}], "organizer" and "status". A list is {items: [...], nextPageToken}. A calendar list entry or a calendar has "id" (an email or "...@group.calendar.google.com"), "summary" and "timeZone". Code adds these fields to every event, so that you can point at them:
- "startAt" and "endAt": the start and the end as text (the dateTime, or the date for an all-day event).
- "isAllDay": true or false.
- "attendeeEmails": the emails of the attendees, as a list.
A freeBusy answer is {calendars: {<calendar id>: {busy: [{start, end}]}}}. Code adds "busyIntervals": [{calendar, start, end}], so that you can point at each busy interval.

World format, under "native.google_calendar":
- calendars[]: {ref, id, summary, description, location, timeZone}. Seed one only for a calendar that the call names and that is not "primary". Its "id" is the real calendar id ("$reads[0].id"). Use a ref such as "calendar:<id>".
- events[]: {ref, id, calendar, summary, description, location, start, end, all_day, attendees, status, timeZone}.
  - "id": the real event id ("$result.id", or "$result.items[n].id"). Never invent an id.
  - "start" and "end": "$result.startAt" and "$result.endAt". For an all-day event set "all_day": true.
  - "attendees": the email list "$result.attendeeEmails".
  - "calendar": leave it out for the primary calendar. For another calendar, use the ref of the calendar that you seed.
  - Do not write "organizer" or "owner": code places every event in the one account that the call can read.
  - Write "status" only when the real status is "cancelled" or "tentative".
  - An instance of a recurring event is a normal event with its own id: seed it without "recurrence".
For a list, seed one event for each item that you have, with "$result.items[n]." pointers.

Calls and what they need:
- A read of one event or a list: seed the events of the answer. A write on an event (patch, put, delete, move) names the event in its path: seed that event with its real id, from the read that you are given. A create needs no seed unless the path names a calendar that is not "primary".
- freeBusy: seed one event for each busy interval, with only "start" and "end" ("$result.busyIntervals[n].start" and "...end"), and no "summary". Seed the calendar of each non-primary id in the request body.
- Reads of "colors" and of "calendarList/primary" need no seed.
