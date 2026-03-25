export type Mode = 'text' | 'binary'

export type MessageName =
  | 'parseComplete'
  | 'bindComplete'
  | 'closeComplete'
  | 'noData'
  | 'portalSuspended'
  | 'replicationStart'
  | 'emptyQuery'
  | 'copyDone'
  | 'copyData'
  | 'rowDescription'
  | 'parameterDescription'
  | 'parameterStatus'
  | 'backendKeyData'
  | 'notification'
  | 'readyForQuery'
  | 'commandComplete'
  | 'dataRow'
  | 'copyInResponse'
  | 'copyOutResponse'
  | 'authenticationOk'
  | 'authenticationMD5Password'
  | 'authenticationCleartextPassword'
  | 'authenticationSASL'
  | 'authenticationSASLContinue'
  | 'authenticationSASLFinal'
  | 'error'
  | 'notice'

export interface BackendMessage {
  name: MessageName
  length: number
}

export const parseComplete: BackendMessage = {
  name: 'parseComplete',
  length: 5,
}

export const bindComplete: BackendMessage = {
  name: 'bindComplete',
  length: 5,
}

export const closeComplete: BackendMessage = {
  name: 'closeComplete',
  length: 5,
}

export const noData: BackendMessage = {
  name: 'noData',
  length: 5,
}

export const portalSuspended: BackendMessage = {
  name: 'portalSuspended',
  length: 5,
}

export const replicationStart: BackendMessage = {
  name: 'replicationStart',
  length: 4,
}

export const emptyQuery: BackendMessage = {
  name: 'emptyQuery',
  length: 4,
}

export const copyDone: BackendMessage = {
  name: 'copyDone',
  length: 4,
}

interface NoticeOrError {
  message: string | undefined
  severity: string | undefined
  code: string | undefined
  detail: string | undefined
  hint: string | undefined
  position: string | undefined
  internalPosition: string | undefined
  internalQuery: string | undefined
  where: string | undefined
  schema: string | undefined
  table: string | undefined
  column: string | undefined
  dataType: string | undefined
  constraint: string | undefined
  file: string | undefined
  line: string | undefined
  routine: string | undefined
}

export class DatabaseError extends Error implements NoticeOrError {
  public severity: string | undefined
  public code: string | undefined
  public detail: string | undefined
  public hint: string | undefined
  public position: string | undefined
  public internalPosition: string | undefined
  public internalQuery: string | undefined
  public where: string | undefined
  public schema: string | undefined
  public table: string | undefined
  public column: string | undefined
  public dataType: string | undefined
  public constraint: string | undefined
  public file: string | undefined
  public line: string | undefined
  public routine: string | undefined
  constructor(
    message: string,
    public readonly length: number,
    public readonly name: MessageName
  ) {
    super(message)
  }
}

export class CopyDataMessage {
  public readonly name = 'copyData'
  constructor(
    public readonly length: number,
    public readonly chunk: Buffer
  ) {}
}

export class CopyResponse {
  public readonly columnTypes: number[]
  constructor(
    public readonly length: number,
    public readonly name: MessageName,
    public readonly binary: boolean,
    columnCount: number
  ) {
    this.columnTypes = new Array(columnCount)
  }
}

export class Field {
  constructor(
    public readonly name: string,
    public readonly tableID: number,
    public readonly columnID: number,
    public readonly dataTypeID: number,
    public readonly dataTypeSize: number,
    public readonly dataTypeModifier: number,
    public readonly format: Mode
  ) {}
}

export class RowDescriptionMessage {
  public readonly name: MessageName = 'rowDescription'
  public readonly fields: Field[]
  constructor(
    public readonly length: number,
    public readonly fieldCount: number
  ) {
    this.fields = new Array(this.fieldCount)
  }
}

export class ParameterDescriptionMessage {
  public readonly name: MessageName = 'parameterDescription'
  public readonly dataTypeIDs: number[]
  constructor(
    public readonly length: number,
    public readonly parameterCount: number
  ) {
    this.dataTypeIDs = new Array(this.parameterCount)
  }
}

export class ParameterStatusMessage {
  public readonly name: MessageName = 'parameterStatus'
  constructor(
    public readonly length: number,
    public readonly parameterName: string,
    public readonly parameterValue: string
  ) {}
}

export class AuthenticationMD5Password implements BackendMessage {
  public readonly name: MessageName = 'authenticationMD5Password'
  constructor(
    public readonly length: number,
    public readonly salt: Buffer
  ) {}
}

export class BackendKeyDataMessage {
  public readonly name: MessageName = 'backendKeyData'
  constructor(
    public readonly length: number,
    public readonly processID: number,
    public readonly secretKey: number
  ) {}
}

export class NotificationResponseMessage {
  public readonly name: MessageName = 'notification'
  constructor(
    public readonly length: number,
    public readonly processId: number,
    public readonly channel: string,
    public readonly payload: string
  ) {}
}

export class ReadyForQueryMessage {
  public readonly name: MessageName = 'readyForQuery'
  constructor(
    public readonly length: number,
    public readonly status: string
  ) {}
}

export class CommandCompleteMessage {
  public readonly name: MessageName = 'commandComplete'
  constructor(
    public readonly length: number,
    public readonly text: string
  ) {}
}

export class DataRowMessage {
  public readonly fieldCount: number
  public readonly name: MessageName = 'dataRow'
  constructor(
    public length: number,
    public fields: any[]
  ) {
    this.fieldCount = fields.length
  }
}

export class NoticeMessage implements BackendMessage, NoticeOrError {
  constructor(
    public readonly length: number,
    public readonly message: string | undefined
  ) {}
  public readonly name = 'notice'
  public severity: string | undefined
  public code: string | undefined
  public detail: string | undefined
  public hint: string | undefined
  public position: string | undefined
  public internalPosition: string | undefined
  public internalQuery: string | undefined
  public where: string | undefined
  public schema: string | undefined
  public table: string | undefined
  public column: string | undefined
  public dataType: string | undefined
  public constraint: string | undefined
  public file: string | undefined
  public line: string | undefined
  public routine: string | undefined
}
