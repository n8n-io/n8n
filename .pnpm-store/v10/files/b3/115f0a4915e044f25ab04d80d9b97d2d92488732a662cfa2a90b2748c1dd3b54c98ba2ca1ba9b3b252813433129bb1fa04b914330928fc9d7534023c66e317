import { z } from 'zod';

declare const encodingTypes: readonly ["BASE64"];
type EncodingTypes = typeof encodingTypes;
type EncodingType = EncodingTypes[number];
declare const valueTypes: readonly ["BINARY"];
type ValueTypes = typeof valueTypes;
type ValueType = ValueTypes[number];
type Attachment = {
    type: "uri";
    url: string;
    formatType?: string;
    encoding?: never;
    value?: never;
    binary?: never;
} | {
    type: "binary";
    url?: never;
    formatType?: never;
    encoding?: EncodingType;
    value?: ValueType;
    binary: string;
};
declare const zAttachment: z.ZodType<Attachment>;

declare const attendeePartStatusTypes: readonly ["NEEDS-ACTION", "ACCEPTED", "DECLINED", "TENTATIVE", "DELEGATED"];
type AttendeePartStatusTypes = typeof attendeePartStatusTypes;
type AttendeePartStatusType = AttendeePartStatusTypes[number];
type Attendee = {
    email: string;
    name?: string;
    member?: string;
    delegatedFrom?: string;
    role?: string;
    partstat?: AttendeePartStatusType;
    dir?: string;
    sentBy?: string;
};
declare const zAttendee: z.ZodType<Attendee>;

type VEventDuration = {
    before?: boolean;
    weeks?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
};
declare const zVEventDuration: z.ZodType<VEventDuration>;

declare const dateObjectTypes: readonly ["DATE", "DATE-TIME"];
type DateObjectTypes = typeof dateObjectTypes;
type DateObjectType = DateObjectTypes[number];
type DateObjectTzProps = {
    date: Date;
    timezone: string;
    tzoffset: string;
};
declare const zDateObjectTzProps: z.ZodObject<{
    date: z.ZodDate;
    timezone: z.ZodString;
    tzoffset: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: Date;
    timezone: string;
    tzoffset: string;
}, {
    date: Date;
    timezone: string;
    tzoffset: string;
}>;
type DateObject = {
    date: Date;
    type?: DateObjectType;
    local?: DateObjectTzProps;
};
declare const zDateObject: z.ZodType<DateObject>;

declare const triggerRelations: readonly ["START", "END"];
type TriggerRelations = typeof triggerRelations;
type TriggerRelation = TriggerRelations[number];
type VEventTriggerUnion = {
    type: "absolute";
    value: DateObject;
} | {
    type: "relative";
    value: VEventDuration;
};
declare const zVEventTriggerUnion: z.ZodType<VEventTriggerUnion>;
type VEventTriggerOptions = {
    related?: TriggerRelation;
};
declare const zVEventTriggerOptions: z.ZodType<VEventTriggerOptions>;
type VEventTriggerBase = {
    options?: VEventTriggerOptions;
};
declare const zVEventTriggerBase: z.ZodType<VEventTriggerBase>;
type VEventTrigger = VEventTriggerBase & VEventTriggerUnion;
declare const zVEventTrigger: z.ZodType<VEventTrigger>;

type VAlarm = {
    action?: string;
    description?: string;
    trigger: VEventTrigger;
    attendees?: Attendee[];
    duration?: VEventDuration;
    repeat?: number;
    summary?: string;
    attachments?: Attachment[];
};
declare const zVAlarm: z.ZodType<VAlarm>;

type Organizer = {
    name?: string;
    email: string;
    dir?: string;
    sentBy?: string;
};
declare const zOrganizer: z.ZodType<Organizer>;

declare const weekDays: readonly ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
type WeekDays = typeof weekDays;
type WeekDay = WeekDays[number];
type WeekdayNumberObject = {
    day: WeekDay;
    occurence?: number;
};
declare const zWeekdayNumberObject: z.ZodType<WeekdayNumberObject>;
type WeekDayNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6;

declare const recurrenceRuleFrequencies: readonly ["SECONDLY", "MINUTELY", "HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
type RecurrenceRuleFrequencies = typeof recurrenceRuleFrequencies;
type RecurrenceRuleFrequency = RecurrenceRuleFrequencies[number];
type RecurrenceRule = {
    frequency: RecurrenceRuleFrequency;
    until?: DateObject;
    count?: number;
    interval?: number;
    bySecond?: number[];
    byMinute?: number[];
    byHour?: number[];
    byDay?: WeekdayNumberObject[];
    byMonthday?: number[];
    byYearday?: number[];
    byWeekNo?: number[];
    byMonth?: number[];
    bySetPos?: number[];
    workweekStart?: WeekDay;
};
declare const zRecurrenceRule: z.ZodType<RecurrenceRule>;

type RecurrenceId = {
    range?: "THISANDFUTURE";
    value: DateObject;
};
declare const zRecurrenceId: z.ZodType<RecurrenceId>;

declare const statusTypes: readonly ["TENTATIVE", "CONFIRMED", "CANCELLED"];
type StatusTypes = typeof statusTypes;
type StatusType = StatusTypes[number];

declare const timeTransparentTypes: readonly ["TRANSPARENT", "OPAQUE"];
type TimeTransparentTypes = typeof timeTransparentTypes;
type TimeTransparentType = TimeTransparentTypes[number];
declare const classTypes: readonly ["PRIVATE", "PUBLIC", "CONFIDENTIAL"];
type ClassTypes = typeof classTypes;
type ClassType = ClassTypes[number];
type VEventDurationOrEnd = {
    duration: VEventDuration;
    end?: never;
} | {
    duration?: never;
    end: DateObject;
};
declare const zVEventDurationOrEnd: z.ZodType<VEventDurationOrEnd>;
type VEventBase = {
    summary: string;
    uid: string;
    created?: DateObject;
    lastModified?: DateObject;
    stamp: DateObject;
    start: DateObject;
    location?: string;
    description?: string;
    categories?: string[];
    recurrenceRule?: RecurrenceRule;
    alarms?: VAlarm[];
    timeTransparent?: TimeTransparentType;
    url?: string;
    geo?: string;
    class?: ClassType;
    organizer?: Organizer;
    priority?: string;
    sequence?: number;
    status?: StatusType;
    attach?: string;
    recurrenceId?: RecurrenceId;
    attendees?: Attendee[];
    comment?: string;
};
declare const zVEventBase: z.ZodType<VEventBase>;
type VEvent = VEventBase & VEventDurationOrEnd;
declare const zVEvent: z.ZodType<VEvent>;

declare const timezonePropTypes: readonly ["STANDARD", "DAYLIGHT"];
type VTimezonePropTypes = typeof timezonePropTypes;
type VTimezonePropType = VTimezonePropTypes[number];
type VTimezoneProp = {
    type: VTimezonePropType;
    start: Date;
    offsetTo: string;
    offsetFrom: string;
    recurrenceRule?: RecurrenceRule;
    comment?: string;
    recurrenceDate?: DateObject;
    name?: string;
};
declare const zVTimezoneProp: z.ZodType<VTimezoneProp>;
type VTimezone = {
    id: string;
    lastModified?: Date;
    url?: string;
    props: VTimezoneProp[];
};
declare const zVTimezone: z.ZodType<VTimezone>;

declare const zVCalendarMethods: readonly ["PUBLISH"];
type VCalendarMethods = typeof zVCalendarMethods;
type VCalenderMethod = VCalendarMethods[number];
type VCalendar = {
    version: "2.0";
    prodId: string;
    method?: VCalenderMethod | string;
    timezones?: VTimezone[];
    events?: VEvent[];
};
declare const zVCalendar: z.ZodType<VCalendar>;

declare const generateIcsAlarm: (alarm: VAlarm) => string;

declare const generateIcsAttachment: (attachment: Attachment) => string;

declare const generateIcsAttendee: (attendee: Attendee, key: string) => string;

declare const generateIcsCalendar: (calendar: VCalendar) => string;

declare const generateIcsDate: (date: Date) => string;
declare const generateIcsDateTime: (date: Date) => string;

declare const generateIcsDuration: (duration: VEventDuration) => string;

declare const generateIcsEvent: (event: VEvent) => string;

declare const generateIcsMail: (email: string, isOption?: boolean) => string;

declare const generateIcsOrganizer: (organizer: Organizer) => string;

declare const generateIcsRecurrenceRule: (value: RecurrenceRule) => string;

declare const generateIcsTimeStamp: (icsKey: string, dateObject: DateObject) => string;

declare const generateIcsTimezone: (timezone: VTimezone) => string;

declare const generateIcsTimezoneProp: (timezoneProp: VTimezoneProp) => string;

declare const generateIcsTrigger: (trigger: VEventTrigger) => string | undefined;

declare const generateIcsWeekdayNumber: (value: WeekdayNumberObject) => string;

type ParseIcsAlarm = (rawAlarmString: string, timezones?: VTimezone[]) => VAlarm;
declare const icsAlarmToObject: ParseIcsAlarm;
declare const parseIcsAlarm: ParseIcsAlarm;

declare const icsAttachmentToObject: (attachmentString: string, options?: Record<string, string>) => Attachment;
declare const parseIcsAttachment: (attachmentString: string, options?: Record<string, string>) => Attachment;

declare const icsAttendeeToObject: (attendeeString: string, options?: Record<string, string>) => Attendee;
declare const parseIcsAttendee: (attendeeString: string, options?: Record<string, string>) => Attendee;

declare const icsCalendarToObject: (calendarString: string) => VCalendar;
declare const parseIcsCalendar: (calendarString: string) => VCalendar;

declare const icsDateToDate: (date: string) => Date;
declare const parseIcsDate: (date: string) => Date;
type ParseIcsDateTime = (date: string, timezones?: VTimezone[]) => Date;
declare const icsDateTimeToDateTime: ParseIcsDateTime;
declare const parseIcsDateTime: ParseIcsDateTime;

declare const icsDurationToObject: (durationString: string) => VEventDuration;
declare const parseIcsDuration: (durationString: string) => VEventDuration;

type ParseIcsEvent = (rawEventString: string, timezones?: VTimezone[]) => VEvent;
declare const icsEventToObject: ParseIcsEvent;
declare const parseIcsEvent: ParseIcsEvent;

declare const icsOrganizerToObject: (organizerString: string, options?: Record<string, string>) => Organizer;
declare const parseIcsOrganizer: (organizerString: string, options?: Record<string, string>) => Organizer;

type ParseIcsRecurrenceId = (recurrenceIdString: string, options?: Record<string, string>, timezones?: VTimezone[]) => RecurrenceId;
declare const icsRecurrenceIdToObject: ParseIcsRecurrenceId;
declare const parseIcsRecurrenceId: ParseIcsRecurrenceId;

declare const RRULE_OBJECT_KEYS: readonly ["frequency", "until", "count", "interval", "bySecond", "byMinute", "byHour", "byDay", "byMonthday", "byYearday", "byWeekNo", "byMonth", "bySetPos", "workweekStart"];
type RRuleObjectKeys = typeof RRULE_OBJECT_KEYS;
type RRuleObjectKey = RRuleObjectKeys[number];

declare const recurrenceObjectKeyIsTimeStamp: (objectKey: RRuleObjectKey) => boolean;
declare const recurrenceObjectKeyIsNumberArray: (objectKey: RRuleObjectKey) => boolean;
declare const recurrenceObjectKeyIsWeekdayNumberArray: (objectKey: RRuleObjectKey) => boolean;
declare const recurrenceObjectKeyIsNumber: (objectKey: RRuleObjectKey) => boolean;
type ParseIcsRecurrenceRule = (ruleString: string, timezones?: VTimezone[]) => RecurrenceRule;
declare const icsRecurrenceRuleToObject: ParseIcsRecurrenceRule;
declare const parseIcsRecurrenceRule: ParseIcsRecurrenceRule;

type ParseIcsTimeStamp = (timestamp: string, options?: Record<string, string>, timezones?: VTimezone[]) => DateObject;
declare const icsTimeStampToObject: ParseIcsTimeStamp;
declare const parseicsTimeStamp: ParseIcsTimeStamp;

declare const icsTimezoneToObject: (rawTimezoneString: string) => VTimezone;
declare const parseIcsTimezone: (timezoneString: string) => VTimezone;

type ParseIcsTimezoneProps = (rawTimezonePropString: string, type?: VTimezonePropType) => VTimezoneProp;
declare const icsTimezonePropToObject: ParseIcsTimezoneProps;
declare const parseIcsTimezoneProp: ParseIcsTimezoneProps;

type ParseIcsTrigger = (value: string, options?: Record<string, string>, timezones?: VTimezone[]) => VEventTrigger;
declare const icsTriggerToObject: ParseIcsTrigger;
declare const parseIcsTrigger: ParseIcsTrigger;

declare const icsWeekdayNumberToObject: (weekdayNumberString: string) => WeekdayNumberObject;
declare const parseIcsWeekdayNumber: (weekdayNumberString: string) => WeekdayNumberObject;

declare const getEventEndFromDuration: (start: Date, duration: VEventDuration) => Date;
declare const getDurationFromInterval: (start: Date, end: Date) => VEventDuration;

declare const getEventEnd: (event: VEvent) => Date;

type ExtendByRecurrenceRuleOptions = {
    start: Date;
    end?: Date;
};
declare const DEFAULT_END_IN_YEARS = 2;
declare const extendByRecurrenceRule: (rule: RecurrenceRule, options: ExtendByRecurrenceRuleOptions) => Date[];

declare const extendTimezoneProps: (date: Date, timezoneProps: VTimezoneProp[]) => VTimezoneProp[];

declare const getTimezoneObjectOffset: (date: Date, tzid: string, timezones?: VTimezone[]) => {
    offset: DateObjectTzProps["tzoffset"];
    milliseconds: number;
} | undefined;

declare const timeZoneOffsetToMilliseconds: (offset: string) => number;

export { type Attachment, type Attendee, type AttendeePartStatusType, type AttendeePartStatusTypes, type ClassType, type ClassTypes, DEFAULT_END_IN_YEARS, type DateObject, type DateObjectType, type DateObjectTypes, type DateObjectTzProps, type EncodingType, type EncodingTypes, type ExtendByRecurrenceRuleOptions, type Organizer, type ParseIcsAlarm, type ParseIcsDateTime, type ParseIcsEvent, type ParseIcsRecurrenceId, type ParseIcsRecurrenceRule, type ParseIcsTimeStamp, type ParseIcsTimezoneProps, type ParseIcsTrigger, type RecurrenceId, type RecurrenceRule, type RecurrenceRuleFrequencies, type RecurrenceRuleFrequency, type StatusType, type StatusTypes, type TimeTransparentType, type TimeTransparentTypes, type TriggerRelation, type TriggerRelations, type VAlarm, type VCalendar, type VCalendarMethods, type VCalenderMethod, type VEvent, type VEventBase, type VEventDuration, type VEventDurationOrEnd, type VEventTrigger, type VEventTriggerBase, type VEventTriggerOptions, type VEventTriggerUnion, type VTimezone, type VTimezoneProp, type VTimezonePropType, type VTimezonePropTypes, type ValueType, type ValueTypes, type WeekDay, type WeekDayNumber, type WeekDays, type WeekdayNumberObject, attendeePartStatusTypes, classTypes, dateObjectTypes, encodingTypes, extendByRecurrenceRule, extendTimezoneProps, generateIcsAlarm, generateIcsAttachment, generateIcsAttendee, generateIcsCalendar, generateIcsDate, generateIcsDateTime, generateIcsDuration, generateIcsEvent, generateIcsMail, generateIcsOrganizer, generateIcsRecurrenceRule, generateIcsTimeStamp, generateIcsTimezone, generateIcsTimezoneProp, generateIcsTrigger, generateIcsWeekdayNumber, getDurationFromInterval, getEventEnd, getEventEndFromDuration, getTimezoneObjectOffset, icsAlarmToObject, icsAttachmentToObject, icsAttendeeToObject, icsCalendarToObject, icsDateTimeToDateTime, icsDateToDate, icsDurationToObject, icsEventToObject, icsOrganizerToObject, icsRecurrenceIdToObject, icsRecurrenceRuleToObject, icsTimeStampToObject, icsTimezonePropToObject, icsTimezoneToObject, icsTriggerToObject, icsWeekdayNumberToObject, parseIcsAlarm, parseIcsAttachment, parseIcsAttendee, parseIcsCalendar, parseIcsDate, parseIcsDateTime, parseIcsDuration, parseIcsEvent, parseIcsOrganizer, parseIcsRecurrenceId, parseIcsRecurrenceRule, parseIcsTimezone, parseIcsTimezoneProp, parseIcsTrigger, parseIcsWeekdayNumber, parseicsTimeStamp, recurrenceObjectKeyIsNumber, recurrenceObjectKeyIsNumberArray, recurrenceObjectKeyIsTimeStamp, recurrenceObjectKeyIsWeekdayNumberArray, recurrenceRuleFrequencies, statusTypes, timeTransparentTypes, timeZoneOffsetToMilliseconds, timezonePropTypes, triggerRelations, valueTypes, weekDays, zAttachment, zAttendee, zDateObject, zDateObjectTzProps, zOrganizer, zRecurrenceId, zRecurrenceRule, zVAlarm, zVCalendar, zVCalendarMethods, zVEvent, zVEventBase, zVEventDuration, zVEventDurationOrEnd, zVEventTrigger, zVEventTriggerBase, zVEventTriggerOptions, zVEventTriggerUnion, zVTimezone, zVTimezoneProp, zWeekdayNumberObject };
