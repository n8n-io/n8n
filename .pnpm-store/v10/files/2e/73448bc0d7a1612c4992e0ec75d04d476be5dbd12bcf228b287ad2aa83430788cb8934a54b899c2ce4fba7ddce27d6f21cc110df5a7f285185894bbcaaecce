declare module 'cloudflare:sockets' {
  export class Socket {
    public readonly readable: any
    public readonly writable: any
    public readonly closed: Promise<void>
    public close(): Promise<void>
    public startTls(options: TlsOptions): Socket
  }

  export type TlsOptions = {
    expectedServerHostname?: string
  }

  export type SocketAddress = {
    hostname: string
    port: number
  }

  export type SocketOptions = {
    secureTransport?: 'off' | 'on' | 'starttls'
    allowHalfOpen?: boolean
  }

  export function connect(address: string | SocketAddress, options?: SocketOptions): Socket
}
