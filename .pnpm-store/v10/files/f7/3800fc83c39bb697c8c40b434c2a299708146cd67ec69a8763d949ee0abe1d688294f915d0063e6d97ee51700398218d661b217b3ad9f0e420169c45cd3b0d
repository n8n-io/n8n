/**
 * What is the default action for this signal when it is not handled.
 */
export type SignalAction = 'terminate' | 'core' | 'ignore' | 'pause' | 'unpause'

/**
 * Which standard defined that signal.
 */
export type SignalStandard = 'ansi' | 'posix' | 'bsd' | 'systemv' | 'other'

/**
 * Standard name of the signal, for example 'SIGINT'.
 */
export type SignalName =
  | 'SIGHUP'
  | 'SIGINT'
  | 'SIGQUIT'
  | 'SIGILL'
  | 'SIGTRAP'
  | 'SIGABRT'
  | 'SIGIOT'
  | 'SIGBUS'
  | 'SIGEMT'
  | 'SIGFPE'
  | 'SIGKILL'
  | 'SIGUSR1'
  | 'SIGSEGV'
  | 'SIGUSR2'
  | 'SIGPIPE'
  | 'SIGALRM'
  | 'SIGTERM'
  | 'SIGSTKFLT'
  | 'SIGCHLD'
  | 'SIGCLD'
  | 'SIGCONT'
  | 'SIGSTOP'
  | 'SIGTSTP'
  | 'SIGTTIN'
  | 'SIGBREAK'
  | 'SIGTTOU'
  | 'SIGURG'
  | 'SIGXCPU'
  | 'SIGXFSZ'
  | 'SIGVTALRM'
  | 'SIGPROF'
  | 'SIGWINCH'
  | 'SIGIO'
  | 'SIGPOLL'
  | 'SIGINFO'
  | 'SIGPWR'
  | 'SIGSYS'
  | 'SIGUNUSED'
  | 'SIGRT1'
  | 'SIGRT2'
  | 'SIGRT3'
  | 'SIGRT4'
  | 'SIGRT5'
  | 'SIGRT6'
  | 'SIGRT7'
  | 'SIGRT8'
  | 'SIGRT9'
  | 'SIGRT10'
  | 'SIGRT11'
  | 'SIGRT12'
  | 'SIGRT13'
  | 'SIGRT14'
  | 'SIGRT15'
  | 'SIGRT16'
  | 'SIGRT17'
  | 'SIGRT18'
  | 'SIGRT19'
  | 'SIGRT20'
  | 'SIGRT21'
  | 'SIGRT22'
  | 'SIGRT23'
  | 'SIGRT24'
  | 'SIGRT25'
  | 'SIGRT26'
  | 'SIGRT27'
  | 'SIGRT28'
  | 'SIGRT29'
  | 'SIGRT30'
  | 'SIGRT31'

/**
 * Code number of the signal, for example 2.
 * While most number are cross-platform, some are different between different
 * OS.
 */
export type SignalNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 34
  | 35
  | 36
  | 37
  | 38
  | 39
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 49
  | 50
  | 51
  | 52
  | 53
  | 54
  | 55
  | 56
  | 57
  | 58
  | 59
  | 60
  | 61
  | 62
  | 63
  | 64

export interface Signal {
  /**
   * Standard name of the signal, for example 'SIGINT'.
   */
  name: SignalName

  /**
   * Code number of the signal, for example 2.
   * While most number are cross-platform, some are different between different
   * OS.
   */
  number: SignalNumber

  /**
   * Human-friendly description for the signal, for example
   * 'User interruption with CTRL-C'.
   */
  description: string

  /**
   * Whether the current OS can handle this signal in Node.js using
   * `process.on(name, handler)`. The list of supported signals is OS-specific.
   */
  supported: boolean

  /**
   * What is the default action for this signal when it is not handled.
   */
  action: SignalAction

  /**
   * Whether the signal's default action cannot be prevented.
   * This is true for SIGTERM, SIGKILL and SIGSTOP.
   */
  forced: boolean

  /**
   * Which standard defined that signal.
   */
  standard: SignalStandard
}

/**
 * Object whose keys are signal names and values are signal objects.
 */
export declare const signalsByName: { [SignalNameType in SignalName]: Signal }

/**
 * Object whose keys are signal numbers and values are signal objects.
 */
export declare const signalsByNumber: {
  [SignalNumberType in SignalNumber]: Signal
}
