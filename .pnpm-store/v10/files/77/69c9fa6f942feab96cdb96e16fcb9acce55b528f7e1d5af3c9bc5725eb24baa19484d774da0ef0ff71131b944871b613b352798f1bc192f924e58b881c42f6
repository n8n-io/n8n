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
import assert from 'assert'

// every message is prefixed with a single bye
const CODE_LENGTH = 1
// every message has an int32 length which includes itself but does
// NOT include the code in the length
const LEN_LENGTH = 4

const HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH

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
    switch (code) {
      case MessageCodes.BindComplete:
        return bindComplete
      case MessageCodes.ParseComplete:
        return parseComplete
      case MessageCodes.CloseComplete:
        return closeComplete
      case MessageCodes.NoData:
        return noData
      case MessageCodes.PortalSuspended:
        return portalSuspended
      case MessageCodes.CopyDone:
        return copyDone
      case MessageCodes.ReplicationStart:
        return replicationStart
      case MessageCodes.EmptyQuery:
        return emptyQuery
      case MessageCodes.DataRow:
        return this.parseDataRowMessage(offset, length, bytes)
      case MessageCodes.CommandComplete:
        return this.parseCommandCompleteMessage(offset, length, bytes)
      case MessageCodes.ReadyForQuery:
        return this.parseReadyForQueryMessage(offset, length, bytes)
      case MessageCodes.NotificationResponse:
        return this.parseNotificationMessage(offset, length, bytes)
      case MessageCodes.AuthenticationResponse:
        return this.parseAuthenticationResponse(offset, length, bytes)
      case MessageCodes.ParameterStatus:
        return this.parseParameterStatusMessage(offset, length, bytes)
      case MessageCodes.BackendKeyData:
        return this.parseBackendKeyData(offset, length, bytes)
      case MessageCodes.ErrorMessage:
        return this.parseErrorMessage(offset, length, bytes, 'error')
      case MessageCodes.NoticeMessage:
        return this.parseErrorMessage(offset, length, bytes, 'notice')
      case MessageCodes.RowDescriptionMessage:
        return this.parseRowDescriptionMessage(offset, length, bytes)
      case MessageCodes.ParameterDescriptionMessage:
        return this.parseParameterDescriptionMessage(offset, length, bytes)
      case MessageCodes.CopyIn:
        return this.parseCopyInMessage(offset, length, bytes)
      case MessageCodes.CopyOut:
        return this.parseCopyOutMessage(offset, length, bytes)
      case MessageCodes.CopyData:
        return this.parseCopyData(offset, length, bytes)
      default:
        return new DatabaseError('received invalid response: ' + code.toString(16), length, 'error')
    }
  }

  private parseReadyForQueryMessage(offset: number, length: number, bytes: Buffer) {
    this.reader.setBuffer(offset, bytes)
    const status = this.reader.string(1)
    return new ReadyForQueryMessage(length, status)
  }

  private parseCommandCompleteMessage(offset: number, length: number, bytes: Buffer) {
    this.reader.setBuffer(offset, bytes)
    const text = this.reader.cstring()
    return new CommandCompleteMessage(length, text)
  }

  private parseCopyData(offset: number, length: number, bytes: Buffer) {
    const chunk = bytes.slice(offset, offset + (length - 4))
    return new CopyDataMessage(length, chunk)
  }

  private parseCopyInMessage(offset: number, length: number, bytes: Buffer) {
    return this.parseCopyMessage(offset, length, bytes, 'copyInResponse')
  }

  private parseCopyOutMessage(offset: number, length: number, bytes: Buffer) {
    return this.parseCopyMessage(offset, length, bytes, 'copyOutResponse')
  }

  private parseCopyMessage(offset: number, length: number, bytes: Buffer, messageName: MessageName) {
    this.reader.setBuffer(offset, bytes)
    const isBinary = this.reader.byte() !== 0
    const columnCount = this.reader.int16()
    const message = new CopyResponse(length, messageName, isBinary, columnCount)
    for (let i = 0; i < columnCount; i++) {
      message.columnTypes[i] = this.reader.int16()
    }
    return message
  }

  private parseNotificationMessage(offset: number, length: number, bytes: Buffer) {
    this.reader.setBuffer(offset, bytes)
    const processId = this.reader.int32()
    const channel = this.reader.cstring()
    const payload = this.reader.cstring()
    return new NotificationResponseMessage(length, processId, channel, payload)
  }

  private parseRowDescriptionMessage(offset: number, length: number, bytes: Buffer) {
    this.reader.setBuffer(offset, bytes)
    const fieldCount = this.reader.int16()
    const message = new RowDescriptionMessage(length, fieldCount)
    for (let i = 0; i < fieldCount; i++) {
      message.fields[i] = this.parseField()
    }
    return message
  }

  private parseField(): Field {
    const name = this.reader.cstring()
    const tableID = this.reader.int32()
    const columnID = this.reader.int16()
    const dataTypeID = this.reader.int32()
    const dataTypeSize = this.reader.int16()
    const dataTypeModifier = this.reader.int32()
    const mode = this.reader.int16() === 0 ? 'text' : 'binary'
    return new Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode)
  }

  private parseParameterDescriptionMessage(offset: number, length: number, bytes: Buffer) {
    this.reader.setBuffer(offset, bytes)
    const parameterCount = this.reader.int16()
    const message = new ParameterDescriptionMessage(length, parameterCount)
    for (let i = 0; i < parameterCount; i++) {
      message.dataTypeIDs[i] = this.reader.int32()
    }
    return message
  }

  private parseDataRowMessage(offset: number, length: number, bytes: Buffer) {
    this.reader.setBuffer(offset, bytes)
    const fieldCount = this.reader.int16()
    const fields: any[] = new Array(fieldCount)
    for (let i = 0; i < fieldCount; i++) {
      const len = this.reader.int32()
      // a -1 for length means the value of the field is null
      fields[i] = len === -1 ? null : this.reader.string(len)
    }
    return new DataRowMessage(length, fields)
  }

  private parseParameterStatusMessage(offset: number, length: number, bytes: Buffer) {
    this.reader.setBuffer(offset, bytes)
    const name = this.reader.cstring()
    const value = this.reader.cstring()
    return new ParameterStatusMessage(length, name, value)
  }

  private parseBackendKeyData(offset: number, length: number, bytes: Buffer) {
    this.reader.setBuffer(offset, bytes)
    const processID = this.reader.int32()
    const secretKey = this.reader.int32()
    return new BackendKeyDataMessage(length, processID, secretKey)
  }

  public parseAuthenticationResponse(offset: number, length: number, bytes: Buffer) {
    this.reader.setBuffer(offset, bytes)
    const code = this.reader.int32()
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
          const salt = this.reader.bytes(4)
          return new AuthenticationMD5Password(length, salt)
        }
        break
      case 10: // AuthenticationSASL
        message.name = 'authenticationSASL'
        message.mechanisms = []
        let mechanism: string
        do {
          mechanism = this.reader.cstring()

          if (mechanism) {
            message.mechanisms.push(mechanism)
          }
        } while (mechanism)
        break
      case 11: // AuthenticationSASLContinue
        message.name = 'authenticationSASLContinue'
        message.data = this.reader.string(length - 8)
        break
      case 12: // AuthenticationSASLFinal
        message.name = 'authenticationSASLFinal'
        message.data = this.reader.string(length - 8)
        break
      default:
        throw new Error('Unknown authenticationOk message type ' + code)
    }
    return message
  }

  private parseErrorMessage(offset: number, length: number, bytes: Buffer, name: MessageName) {
    this.reader.setBuffer(offset, bytes)
    const fields: Record<string, string> = {}
    let fieldType = this.reader.string(1)
    while (fieldType !== '\0') {
      fields[fieldType] = this.reader.cstring()
      fieldType = this.reader.string(1)
    }

    const messageValue = fields.M

    const message =
      name === 'notice' ? new NoticeMessage(length, messageValue) : new DatabaseError(messageValue, length, name)

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
}
