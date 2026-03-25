
//#region src/tools/google_calendar/prompts/create-event-prompt.ts
const CREATE_EVENT_PROMPT = `
Date format: YYYY-MM-DDThh:mm:ss+00:00
Based on this event description: "Joey birthday tomorrow at 7 pm",
output a JSON string of the following parameters. Do not include any other text or comments: 
Today's datetime on UTC time 2023-05-02T10:00:00+00:00, it's Tuesday and timezone
of the user is -5, take into account the timezone of the user and today's date.
1. event_summary 
2. event_start_time 
3. event_end_time 
4. event_location 
5. event_description 
6. user_timezone
output:
{{
    "event_summary": "Joey birthday",
    "event_start_time": "2023-05-03T19:00:00-05:00",
    "event_end_time": "2023-05-03T20:00:00-05:00",
    "event_location": "",
    "event_description": "",
    "user_timezone": "America/New_York"
}}

Date format: YYYY-MM-DDThh:mm:ss+00:00
Based on this event description: "Create a meeting for 5 pm on Saturday with Joey",
output a JSON string of the following parameters. Do not include any other text or comments: 
Today's datetime on UTC time 2023-05-04T10:00:00+00:00, it's Thursday and timezone
of the user is -5, take into account the timezone of the user and today's date.
1. event_summary 
2. event_start_time 
3. event_end_time 
4. event_location 
5. event_description 
6. user_timezone
output:
{{
    "event_summary": "Meeting with Joey",
    "event_start_time": "2023-05-06T17:00:00-05:00",
    "event_end_time": "2023-05-06T18:00:00-05:00",
    "event_location": "",
    "event_description": "",
    "user_timezone": "America/New_York"
}}

Date format: YYYY-MM-DDThh:mm:ss+00:00
Based on this event description: "{query}", output a JSON string of the
following parameters. Do not include any other text or comments: 
Today's datetime on UTC time {date}, it's {dayName} and timezone of the user {u_timezone},
take into account the timezone of the user and today's date.
1. event_summary 
2. event_start_time 
3. event_end_time 
4. event_location 
5. event_description 
6. user_timezone 
output:
`;

//#endregion
exports.CREATE_EVENT_PROMPT = CREATE_EVENT_PROMPT;
//# sourceMappingURL=create-event-prompt.cjs.map