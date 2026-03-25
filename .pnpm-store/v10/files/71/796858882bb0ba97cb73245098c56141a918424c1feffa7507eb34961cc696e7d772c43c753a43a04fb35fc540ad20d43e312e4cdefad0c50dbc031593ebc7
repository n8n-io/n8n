// https://www.postgresql.org/docs/current/protocol-message-formats.html
import BufferList from './buffer-list'

const buffers = {
  readyForQuery: function () {
    return new BufferList().add(Buffer.from('I')).join(true, 'Z')
  },

  authenticationOk: function () {
    return new BufferList().addInt32(0).join(true, 'R')
  },

  authenticationCleartextPassword: function () {
    return new BufferList().addInt32(3).join(true, 'R')
  },

  authenticationMD5Password: function () {
    return new BufferList()
      .addInt32(5)
      .add(Buffer.from([1, 2, 3, 4]))
      .join(true, 'R')
  },

  authenticationSASL: function () {
    return new BufferList().addInt32(10).addCString('SCRAM-SHA-256').addCString('').join(true, 'R')
  },

  authenticationSASLContinue: function () {
    return new BufferList().addInt32(11).addString('data').join(true, 'R')
  },

  authenticationSASLFinal: function () {
    return new BufferList().addInt32(12).addString('data').join(true, 'R')
  },

  parameterStatus: function (name: string, value: string) {
    return new BufferList().addCString(name).addCString(value).join(true, 'S')
  },

  backendKeyData: function (processID: number, secretKey: number) {
    return new BufferList().addInt32(processID).addInt32(secretKey).join(true, 'K')
  },

  commandComplete: function (string: string) {
    return new BufferList().addCString(string).join(true, 'C')
  },

  rowDescription: function (fields: any[]) {
    fields = fields || []
    var buf = new BufferList()
    buf.addInt16(fields.length)
    fields.forEach(function (field) {
      buf
        .addCString(field.name)
        .addInt32(field.tableID || 0)
        .addInt16(field.attributeNumber || 0)
        .addInt32(field.dataTypeID || 0)
        .addInt16(field.dataTypeSize || 0)
        .addInt32(field.typeModifier || 0)
        .addInt16(field.formatCode || 0)
    })
    return buf.join(true, 'T')
  },

  parameterDescription: function (dataTypeIDs: number[]) {
    dataTypeIDs = dataTypeIDs || []
    var buf = new BufferList()
    buf.addInt16(dataTypeIDs.length)
    dataTypeIDs.forEach(function (dataTypeID) {
      buf.addInt32(dataTypeID)
    })
    return buf.join(true, 't')
  },

  dataRow: function (columns: any[]) {
    columns = columns || []
    var buf = new BufferList()
    buf.addInt16(columns.length)
    columns.forEach(function (col) {
      if (col == null) {
        buf.addInt32(-1)
      } else {
        var strBuf = Buffer.from(col, 'utf8')
        buf.addInt32(strBuf.length)
        buf.add(strBuf)
      }
    })
    return buf.join(true, 'D')
  },

  error: function (fields: any) {
    return buffers.errorOrNotice(fields).join(true, 'E')
  },

  notice: function (fields: any) {
    return buffers.errorOrNotice(fields).join(true, 'N')
  },

  errorOrNotice: function (fields: any) {
    fields = fields || []
    var buf = new BufferList()
    fields.forEach(function (field: any) {
      buf.addChar(field.type)
      buf.addCString(field.value)
    })
    return buf.add(Buffer.from([0])) // terminator
  },

  parseComplete: function () {
    return new BufferList().join(true, '1')
  },

  bindComplete: function () {
    return new BufferList().join(true, '2')
  },

  notification: function (id: number, channel: string, payload: string) {
    return new BufferList().addInt32(id).addCString(channel).addCString(payload).join(true, 'A')
  },

  emptyQuery: function () {
    return new BufferList().join(true, 'I')
  },

  portalSuspended: function () {
    return new BufferList().join(true, 's')
  },

  closeComplete: function () {
    return new BufferList().join(true, '3')
  },

  copyIn: function (cols: number) {
    const list = new BufferList()
      // text mode
      .addByte(0)
      // column count
      .addInt16(cols)
    for (let i = 0; i < cols; i++) {
      list.addInt16(i)
    }
    return list.join(true, 'G')
  },

  copyOut: function (cols: number) {
    const list = new BufferList()
      // text mode
      .addByte(0)
      // column count
      .addInt16(cols)
    for (let i = 0; i < cols; i++) {
      list.addInt16(i)
    }
    return list.join(true, 'H')
  },

  copyData: function (bytes: Buffer) {
    return new BufferList().add(bytes).join(true, 'd')
  },

  copyDone: function () {
    return new BufferList().join(true, 'c')
  },
}

export default buffers
