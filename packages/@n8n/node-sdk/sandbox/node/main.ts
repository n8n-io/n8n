// The entry of `dist/guest/action.cjs`: the guest of both kinds on stdin and stdout.
import { guestArgsOf, runGuest, stdioTransport } from './transport';

void runGuest(stdioTransport(), guestArgsOf(process.argv.slice(2)));
