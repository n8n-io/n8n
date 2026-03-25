/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { LogVerbosity } from './constants';
import * as logging from './logging';

const TRACER_NAME = 'backoff';

const INITIAL_BACKOFF_MS = 1000;
const BACKOFF_MULTIPLIER = 1.6;
const MAX_BACKOFF_MS = 120000;
const BACKOFF_JITTER = 0.2;

/**
 * Get a number uniformly at random in the range [min, max)
 * @param min
 * @param max
 */
function uniformRandom(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export interface BackoffOptions {
  initialDelay?: number;
  multiplier?: number;
  jitter?: number;
  maxDelay?: number;
}

export class BackoffTimeout {
  /**
   * The delay time at the start, and after each reset.
   */
  private readonly initialDelay: number = INITIAL_BACKOFF_MS;
  /**
   * The exponential backoff multiplier.
   */
  private readonly multiplier: number = BACKOFF_MULTIPLIER;
  /**
   * The maximum delay time
   */
  private readonly maxDelay: number = MAX_BACKOFF_MS;
  /**
   * The maximum fraction by which the delay time can randomly vary after
   * applying the multiplier.
   */
  private readonly jitter: number = BACKOFF_JITTER;
  /**
   * The delay time for the next time the timer runs.
   */
  private nextDelay: number;
  /**
   * The handle of the underlying timer. If running is false, this value refers
   * to an object representing a timer that has ended, but it can still be
   * interacted with without error.
   */
  private timerId: NodeJS.Timeout;
  /**
   * Indicates whether the timer is currently running.
   */
  private running = false;
  /**
   * Indicates whether the timer should keep the Node process running if no
   * other async operation is doing so.
   */
  private hasRef = true;
  /**
   * The time that the currently running timer was started. Only valid if
   * running is true.
   */
  private startTime: Date = new Date();
  /**
   * The approximate time that the currently running timer will end. Only valid
   * if running is true.
   */
  private endTime: Date = new Date();

  private id: number;

  private static nextId = 0;

  constructor(private callback: () => void, options?: BackoffOptions) {
    this.id = BackoffTimeout.getNextId();
    if (options) {
      if (options.initialDelay) {
        this.initialDelay = options.initialDelay;
      }
      if (options.multiplier) {
        this.multiplier = options.multiplier;
      }
      if (options.jitter) {
        this.jitter = options.jitter;
      }
      if (options.maxDelay) {
        this.maxDelay = options.maxDelay;
      }
    }
    this.trace('constructed initialDelay=' + this.initialDelay + ' multiplier=' + this.multiplier + ' jitter=' + this.jitter + ' maxDelay=' + this.maxDelay);
    this.nextDelay = this.initialDelay;
    this.timerId = setTimeout(() => {}, 0);
    clearTimeout(this.timerId);
  }

  private static getNextId() {
    return this.nextId++;
  }

  private trace(text: string) {
    logging.trace(LogVerbosity.DEBUG, TRACER_NAME, '{' + this.id + '} ' + text);
  }

  private runTimer(delay: number) {
    this.trace('runTimer(delay=' + delay + ')');
    this.endTime = this.startTime;
    this.endTime.setMilliseconds(
      this.endTime.getMilliseconds() + delay
    );
    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      this.trace('timer fired');
      this.running = false;
      this.callback();
    }, delay);
    if (!this.hasRef) {
      this.timerId.unref?.();
    }
  }

  /**
   * Call the callback after the current amount of delay time
   */
  runOnce() {
    this.trace('runOnce()');
    this.running = true;
    this.startTime = new Date();
    this.runTimer(this.nextDelay);
    const nextBackoff = Math.min(
      this.nextDelay * this.multiplier,
      this.maxDelay
    );
    const jitterMagnitude = nextBackoff * this.jitter;
    this.nextDelay =
      nextBackoff + uniformRandom(-jitterMagnitude, jitterMagnitude);
  }

  /**
   * Stop the timer. The callback will not be called until `runOnce` is called
   * again.
   */
  stop() {
    this.trace('stop()');
    clearTimeout(this.timerId);
    this.running = false;
  }

  /**
   * Reset the delay time to its initial value. If the timer is still running,
   * retroactively apply that reset to the current timer.
   */
  reset() {
    this.trace('reset() running=' + this.running);
    this.nextDelay = this.initialDelay;
    if (this.running) {
      const now = new Date();
      const newEndTime = this.startTime;
      newEndTime.setMilliseconds(newEndTime.getMilliseconds() + this.nextDelay);
      clearTimeout(this.timerId);
      if (now < newEndTime) {
        this.runTimer(newEndTime.getTime() - now.getTime());
      } else {
        this.running = false;
      }
    }
  }

  /**
   * Check whether the timer is currently running.
   */
  isRunning() {
    return this.running;
  }

  /**
   * Set that while the timer is running, it should keep the Node process
   * running.
   */
  ref() {
    this.hasRef = true;
    this.timerId.ref?.();
  }

  /**
   * Set that while the timer is running, it should not keep the Node process
   * running.
   */
  unref() {
    this.hasRef = false;
    this.timerId.unref?.();
  }

  /**
   * Get the approximate timestamp of when the timer will fire. Only valid if
   * this.isRunning() is true.
   */
  getEndTime() {
    return this.endTime;
  }
}
