import * as process from 'process';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export class Spinner {
  private readonly frames: string[];
  private currentFrame: number;
  private intervalId: NodeJS.Timeout | null;
  private message: string;

  constructor() {
    this.frames = SPINNER_FRAMES;
    this.currentFrame = 0;
    this.intervalId = null;
    this.message = '';
  }

  private showFrame() {
    process.stdout.write('\r' + this.frames[this.currentFrame] + ' ' + this.message);
    this.currentFrame = (this.currentFrame + 1) % this.frames.length;
  }

  start(message: string) {
    if (this.message === message) {
      return;
    }

    this.message = message;
    // If we're not in a TTY, don't display the spinner.
    if (!process.stdout.isTTY) {
      process.stdout.write(`${message}...\n`);
      return;
    }

    if (this.intervalId === null) {
      this.intervalId = setInterval(() => {
        this.showFrame();
      }, 100);
    }
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      process.stdout.write('\r');
    }
    this.message = '';
  }
}
