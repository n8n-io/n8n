import { Service } from 'typedi';
import { TypedEmitter } from '@/TypedEmitter';
import type { Event } from './event.types';

@Service()
export class EventService extends TypedEmitter<Event> {}
