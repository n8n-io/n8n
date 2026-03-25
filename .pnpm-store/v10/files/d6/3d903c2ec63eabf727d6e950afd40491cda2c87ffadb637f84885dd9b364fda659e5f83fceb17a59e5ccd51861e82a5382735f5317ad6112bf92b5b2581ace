import { TransformOptions } from 'stream'
import {
  Mode,
  bindComplete,
  parseComplete,
  closeComplete,
  noData,
  portalSuspended,
  copyDone,
  replicationStart,
  emptyQuery,
  ReadyForQueryMessage,
  CommandCompleteMessage,
  CopyDataMessage,
  CopyResponse,
  NotificationResponseMessage,
  RowDescriptionMessage,
  ParameterDescriptionMessage,
  Field,
  DataRowMessage,
  ParameterStatusMessage,
  BackendKeyDataMessage,
  DatabaseError,
  BackendMessage,
  MessageName,
  AuthenticationMD5Password,
  NoticeMessage,
} from './messages'
import { BufferReader } from './buffer-reader'

// every message is prefixed with a single bye
const CODE_LENGTH = 1
// every message has an int32 length which includes itself but does
// NOT include the code in the length
const LEN_LENGTH = 4

const HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH

// A placeholder for a `BackendMessage`’s length value that will be set after construction.
const LATEINIT_LENGTH = -1

export type Packet = {
  code: number
  packet: Buffer
}

const emptyBuffer = Buffer.allocUnsafe(0)

type StreamOptions = TransformOptions & {
  mode: Mode
}

const enum MessageCodes {
  DataRow = 0x44, // D
  ParseComplete = 0x31, // 1
  BindComplete = 0x32, // 2
  CloseComplete = 0x33, // 3
  CommandComplete = 0x43, // C
  ReadyForQuery = 0x5a, // Z
  NoData = 0x6e, // n
  NotificationResponse = 0x41, // A
  AuthenticationResponse = 0x52, // R
  ParameterStatus = 0x53, // S
  BackendKeyData = 0x4b, // K
  ErrorMessage = 0x45, // E
  NoticeMessage = 0x4e, // N
  RowDescriptionMessage = 0x54, // T
  ParameterDescriptionMessage = 0x74, // t
  PortalSuspended = 0x73, // s
  ReplicationStart = 0x57, // W
  EmptyQuery = 0x49, // I
  CopyIn = 0x47, // G
  CopyOut = 0x48, // H
  CopyDone = 0x63, // c
  CopyData = 0x64, // d
}

export type MessageCallback = (msg: BackendMessage) => void

export class Parser {
  private buffer: Buffer = emptyBuffer
  private bufferLength: number = 0
  private bufferOffset: number = 0
  private reader = new BufferReader()
  private mode: Mode

  constructor(opts?: StreamOptions) {
    if (opts?.mode === 'binary') {
      throw new Error('Binary mode not supported yet')
    }
    this.mode = opts?.mode || 'text'
  }

  public parse(buffer: Buffer, callback: MessageCallback) {
    this.mergeBuffer(buffer)
    const bufferFullLength = this.bufferOffset + this.bufferLength
    let offset = this.bufferOffset
    while (offset + HEADER_LENGTH <= bufferFullLength) {
      // code is 1 byte long - it identifies the message type
      const code = this.buffer[offset]
      // length is 1 Uint32BE - it is the length of the message EXCLUDING the code
      const length = this.buffer.readUInt32BE(offset + CODE_LENGTH)
      const fullMessageLength = CODE_LENGTH + length
      if (fullMessageLength + offset <= bufferFullLength) {
        const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer)
        callback(message)
        offset += fullMessageLength
      } else {
        break
      }
    }
    if (offset === bufferFullLength) {
      // No more use for the buffer
      this.buffer = emptyBuffer
      this.bufferLength = 0
      this.bufferOffset = 0
    } else {
      // Adjust the cursors of remainingBuffer
      this.bufferLength = bufferFullLength - offset
      this.bufferOffset = offset
    }
  }

  private mergeBuffer(buffer: Buffer): void {
    if (this.bufferLength > 0) {
      const newLength = this.bufferLength + buffer.byteLength
      const newFullLength = newLength + this.bufferOffset
      if (newFullLength > this.buffer.byteLength) {
        // We can't concat the new buffer with the remaining one
        let newBuffer: Buffer
        if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
          // We can move the relevant part to the beginning of the buffer instead of allocating a new buffer
          newBuffer = this.buffer
        } else {
          // Allocate a new larger buffer
          let newBufferLength = this.buffer.byteLength * 2
          while (newLength >= newBufferLength) {
            newBufferLength *= 2
          }
          newBuffer = Buffer.allocUnsafe(newBufferLength)
        }
        // Move the remaining buffer to the new one
        this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength)
        this.buffer = newBuffer
        this.bufferOffset = 0
      }
      // Concat the new buffer with the remaining one
      buffer.copy(this.buffer, this.bufferOffset + this.bufferLength)
      this.bufferLength = newLength
    } else {
      this.buffer = buffer
      this.bufferOffset = 0
      this.bufferLength = buffer.byteLength
    }
  }

  private handlePacket(offset: number, code: number, length: number, bytes: Buffer): BackendMessage {
    const { reader } = this

    // NOTE: This undesirably retains the buffer in `this.reader` if the `parse*Message` calls below throw. However, those should only throw in the case of a protocol error, which normally results in the reader being discarded.
    reader.setBuffer(offset, bytes)

    let message: BackendMessage

    switch (code) {
      case MessageCodes.BindComplete:
        message = bindComplete
        break
      case MessageCodes.ParseComplete:
        message = parseComplete
        break
      case MessageCodes.CloseComplete:
        message = closeComplete
        break
      case MessageCodes.NoData:
        message = noData
        break
      case MessageCodes.PortalSuspended:
        message = portalSuspended
        break
      case MessageCodes.CopyDone:
        message = copyDone
        break
      case MessageCodes.ReplicationStart:
        message = replicationStart
        break
      case MessageCodes.EmptyQuery:
        message = emptyQuery
        break
      case MessageCodes.DataRow:
        message = parseDataRowMessage(reader)
        break
      case MessageCodes.CommandComplete:
        message = parseCommandCompleteMessage(reader)
        break
      case MessageCodes.ReadyForQuery:
        message = parseReadyForQueryMessage(reader)
        break
      case MessageCodes.NotificationResponse:
        message = parseNotificationMessage(reader)
        break
      case MessageCodes.AuthenticationResponse:
        message = parseAuthenticationResponse(reader, length)
        break
      case MessageCodes.ParameterStatus:
        message = parseParameterStatusMessage(reader)
        break
      case MessageCodes.BackendKeyData:
        message = parseBackendKeyData(reader)
        break
      case MessageCodes.ErrorMessage:
        message = parseErrorMessage(reader, 'error')
        break
      case MessageCodes.NoticeMessage:
        message = parseErrorMessage(reader, 'notice')
        break
      case MessageCodes.RowDescriptionMessage:
        message = parseRowDescriptionMessage(reader)
        break
      case MessageCodes.ParameterDescriptionMessage:
        message = parseParameterDescriptionMessage(reader)
        break
      case MessageCodes.CopyIn:
        message = parseCopyInMessage(reader)
        break
      case MessageCodes.CopyOut:
        message = parseCopyOutMessage(reader)
        break
      case MessageCodes.CopyData:
        message = parseCopyData(reader, length)
        break
      default:
        return new DatabaseError('received invalid response: ' + code.toString(16), length, 'error')
    }

    reader.setBuffer(0, emptyBuffer)

    message.length = length
    return message
  }
}

const parseReadyForQueryMessage = (reader: BufferReader) => {
  const status = reader.string(1)
  return new ReadyForQueryMessage(LATEINIT_LENGTH, status)
}

const parseCommandCompleteMessage = (reader: BufferReader) => {
  const text = reader.cstring()
  return new CommandCompleteMessage(LATEINIT_LENGTH, text)
}

const parseCopyData = (reader: BufferReader, length: number) => {
  const chunk = reader.bytes(length - 4)
  return new CopyDataMessage(LATEINIT_LENGTH, chunk)
}

const parseCopyInMessage = (reader: BufferReader) => parseCopyMessage(reader, 'copyInResponse')

const parseCopyOutMessage = (reader: BufferReader) => parseCopyMessage(reader, 'copyOutResponse')

const parseCopyMessage = (reader: BufferReader, messageName: MessageName) => {
  const isBinary = reader.byte() !== 0
  const columnCount = reader.int16()
  const message = new CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount)
  for (let i = 0; i < columnCount; i++) {
    message.columnTypes[i] = reader.int16()
  }
  return message
}

const parseNotificationMessage = (reader: BufferReader) => {
  const processId = reader.int32()
  const channel = reader.cstring()
  const payload = reader.cstring()
  return new NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload)
}

const parseRowDescriptionMessage = (reader: BufferReader) => {
  const fieldCount = reader.int16()
  const message = new RowDescriptionMessage(LATEINIT_LENGTH, fieldCount)
  for (let i = 0; i < fieldCount; i++) {
    message.fields[i] = parseField(reader)
  }
  return message
}

const parseField = (reader: BufferReader) => {
  const name = reader.cstring()
  const tableID = reader.uint32()
  const columnID = reader.int16()
  const dataTypeID = reader.uint32()
  const dataTypeSize = reader.int16()
  const dataTypeModifier = reader.int32()
  const mode = reader.int16() === 0 ? 'text' : 'binary'
  return new Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode)
}

const parseParameterDescriptionMessage = (reader: BufferReader) => {
  const parameterCount = reader.int16()
  const message = new ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount)
  for (let i = 0; i < parameterCount; i++) {
    message.dataTypeIDs[i] = reader.int32()
  }
  return message
}

const parseDataRowMessage = (reader: BufferReader) => {
  const fieldCount = reader.int16()
  const fields: any[] = new Array(fieldCount)
  for (let i = 0; i < fieldCount; i++) {
    const len = reader.int32()
    // a -1 for length means the value of the field is null
    fields[i] = len === -1 ? null : reader.string(len)
  }
  return new DataRowMessage(LATEINIT_LENGTH, fields)
}

const parseParameterStatusMessage = (reader: BufferReader) => {
  const name = reader.cstring()
  const value = reader.cstring()
  return new ParameterStatusMessage(LATEINIT_LENGTH, name, value)
}

const parseBackendKeyData = (reader: BufferReader) => {
  const processID = reader.int32()
  const secretKey = reader.int32()
  return new BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey)
}

const parseAuthenticationResponse = (reader: BufferReader, length: number) => {
  const code = reader.int32()
  // TODO(bmc): maybe better types here
  const message: BackendMessage & any = {
    name: 'authenticationOk',
    length,
  }

  switch (code) {
    case 0: // AuthenticationOk
      break
    case 3: // AuthenticationCleartextPassword
      if (message.length === 8) {
        message.name = 'authenticationCleartextPassword'
      }
      break
    case 5: // AuthenticationMD5Password
      if (message.length === 12) {
        message.name = 'authenticationMD5Password'
        const salt = reader.bytes(4)
        return new AuthenticationMD5Password(LATEINIT_LENGTH, salt)
      }
      break
    case 10: // AuthenticationSASL
      {
        message.name = 'authenticationSASL'
        message.mechanisms = []
        let mechanism: string
        do {
          mechanism = reader.cstring()
          if (mechanism) {
            message.mechanisms.push(mechanism)
          }
        } while (mechanism)
      }
      break
    case 11: // AuthenticationSASLContinue
      message.name = 'authenticationSASLContinue'
      message.data = reader.string(length - 8)
      break
    case 12: // AuthenticationSASLFinal
      message.name = 'authenticationSASLFinal'
      message.data = reader.string(length - 8)
      break
    default:
      throw new Error('Unknown authenticationOk message type ' + code)
  }
  return message
}

const parseErrorMessage = (reader: BufferReader, name: MessageName) => {
  const fields: Record<string, string> = {}
  let fieldType = reader.string(1)
  while (fieldType !== '\0') {
    fields[fieldType] = reader.cstring()
    fieldType = reader.string(1)
  }

  const messageValue = fields.M

  const message =
    name === 'notice'
      ? new NoticeMessage(LATEINIT_LENGTH, messageValue)
      : new DatabaseError(messageValue, LATEINIT_LENGTH, name)

  message.severity = fields.S
  message.code = fields.C
  message.detail = fields.D
  message.hint = fields.H
  message.position = fields.P
  message.internalPosition = fields.p
  message.internalQuery = fields.q
  message.where = fields.W
  message.schema = fields.s
  message.table = fields.t
  message.column = fields.c
  message.dataType = fields.d
  message.constraint = fields.n
  message.file = fields.F
  message.line = fields.L
  message.routine = fields.R
  return message
}
