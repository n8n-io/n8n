export type DateArray =
  | [number, number, number, number, number]
  | [number, number, number, number]
  | [number, number, number];

export type DurationObject = {
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  before?: boolean;
};

export type GeoCoordinates = {
  lat: number;
  lon: number;
};

export type EventStatus = 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED';

export type ParticipationStatus =
  | 'NEEDS-ACTION'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'TENTATIVE'
  | 'DELEGATED'
  | 'COMPLETED'
  | 'IN-PROCESS';

export type ParticipationRole =
  | 'CHAIR'
  | 'REQ-PARTICIPANT'
  | 'OPT-PARTICIPANT'
  | 'NON-PARTICIPANT';

export type Person = {
  name?: string;
  email?: string;
  dir?: string;
};

export type Attendee = Person & {
  rsvp?: boolean;
  partstat?: ParticipationStatus;
  role?: ParticipationRole;
};

export type ActionType = 'audio' | 'display' | 'email' | 'procedure';

/**
 * This property defines the access classification for a calendar component.
 */
export type classificationType = 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL' | string;

export type Alarm = {
  action?: ActionType;
  description?: string;
  summary?: string;
  duration?: DurationObject;
  trigger?: DurationObject; // @todo DateArray | DurationObject;
  repeat?: number;
  attachType?: string;
  attach?: string;
};

export type EventAttributes = {
  start: DateArray;
  startInputType?: 'local' | 'utc';
  startOutputType?: 'local' | 'utc';

  endInputType?: 'local' | 'utc';
  endOutputType?: 'local' | 'utc';

  title?: string;
  description?: string;

  location?: string;
  geo?: GeoCoordinates;

  url?: string;
  status?: EventStatus;
  busyStatus?: 'FREE' | 'BUSY' | 'TENTATIVE' | 'OOF';
  
  organizer?: Person;
  attendees?: Attendee[];
  
  categories?: string[];
  alarms?: Alarm[];
  
  productId?: string;
  uid?: string;
  method?: string;
  recurrenceRule?: string;
  sequence?: number;
  calName?: string;
  classification?: classificationType;
  created?: DateArray;
  lastModified?: DateArray;
  htmlContent?: string;
} & ({ end: DateArray } | { duration: DurationObject });

export type ReturnObject = { error?: Error; value?: string };

type NodeCallback = (error: Error | undefined, value: string) => void;

export function createEvent(attributes: EventAttributes, callback: NodeCallback): void;

export function createEvent(attributes: EventAttributes): ReturnObject;

export function createEvents(events: EventAttributes[], callback: NodeCallback): void;

export function createEvents(events: EventAttributes[]): ReturnObject;

export function convertTimestampToArray(timestamp: Number, inputType: String): DateArray;
