const EventEmitter = require('bare-events')
const fs = require('.')

class FileHandle extends EventEmitter {
  constructor(fd) {
    this.fd = fd
  }

  async close() {
    await fs.close(fd)

    this.fd = -1
    this.emit('close')
  }

  async read(buffer, ...args) {
    return {
      bytesRead: await fs.read(this.fd, buffer, ...args),
      buffer
    }
  }

  async readv(buffers, ...args) {
    return {
      bytesRead: await fs.readv(this.fd, buffers, ...args),
      buffers
    }
  }

  async write(buffer, ...args) {
    return {
      bytesWritten: await fs.write(this.fd, buffer, ...args),
      buffer
    }
  }

  async writev(buffers, ...args) {
    return {
      bytesWritten: await fs.writev(this.fd, buffers, ...args),
      buffers
    }
  }

  async stat() {
    return fs.fstat(this.fd)
  }

  async chmod(mode) {
    await fs.fchmod(this.fd, mode)
  }

  createReadStream(opts) {
    return fs.createReadStream(null, { ...opts, fd: this.fd })
  }

  createWriteStream(opts) {
    return fs.createWriteStream(null, { ...opts, fd: this.fd })
  }

  async [Symbol.asyncDispose]() {
    await this.close()
  }
}

exports.open = async function open(filepath, flags, mode) {
  return new FileHandle(await fs.open(filepath, flags, mode))
}

exports.access = fs.access
exports.appendFile = fs.appendFile
exports.chmod = fs.chmod
exports.constants = fs.constants
exports.copyFile = fs.copyFile
exports.cp = fs.cp
exports.lstat = fs.lstat
exports.mkdir = fs.mkdir
exports.opendir = fs.opendir
exports.readFile = fs.readFile
exports.readdir = fs.readdir
exports.readlink = fs.readlink
exports.realpath = fs.realpath
exports.rename = fs.rename
exports.rm = fs.rm
exports.rmdir = fs.rmdir
exports.stat = fs.stat
exports.symlink = fs.symlink
exports.unlink = fs.unlink
exports.utimes = fs.utimes
exports.watch = fs.watch
exports.writeFile = fs.writeFile
