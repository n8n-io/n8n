import { _isFinite } from './_setup.js';
import isSymbol from './isSymbol.js';

// Is a given object a finite number?
export default function isFinite(obj) {
  return !isSymbol(obj) && _isFinite(obj) && !isNaN(parseFloat(obj));
}
