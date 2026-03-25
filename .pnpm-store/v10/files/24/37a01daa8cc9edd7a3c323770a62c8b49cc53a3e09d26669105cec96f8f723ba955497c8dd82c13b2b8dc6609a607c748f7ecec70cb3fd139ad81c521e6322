//#region src/tools/google_calendar/prompts/view-events-prompt.ts
const VIEW_EVENTS_PROMPT = `
Date format: YYYY-MM-DDThh:mm:ss+00:00
Based on this event description: 'View my events on Thursday',
output a JSON string of the following parameters. Do not include any other text or comments: 
Today's datetime on UTC time 2023-05-02T10:00:00+00:00, it's Tuesday and timezone
of the user is -5, take into account the timezone of the user and today's date.
If the user is searching for events with a specific title, person or location, put it into the search_query parameter.
1. time_min 
2. time_max
3. user_timezone
4. max_results 
5. search_query 
output:
{{
    "time_min": "2023-05-04T00:00:00-05:00",
    "time_max": "2023-05-04T23:59:59-05:00",
    "user_timezone": "America/New_York",
    "max_results": 10,
    "search_query": ""
}}

Date format: YYYY-MM-DDThh:mm:ss+00:00
Based on this event description: '{query}', output a JSON string of the following parameters. Do not include any other text or comments: 
Today's datetime on UTC time {date}, today it's {dayName} and timezone of the user {u_timezone},
take into account the timezone of the user and today's date.
If the user is searching for events with a specific title, person or location, put it into the search_query parameter.
1. time_min 
2. time_max
3. user_timezone
4. max_results 
5. search_query 
output:
`;

//#endregion
export { VIEW_EVENTS_PROMPT };
//# sourceMappingURL=view-events-prompt.js.map