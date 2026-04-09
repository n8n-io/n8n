import { IconifyIcon } from '@iconify/types';
import { IconifyIconBuildResult } from './build.cjs';
import '../customisations/defaults.cjs';
import './viewbox.cjs';

/**
 * Parsed SVG content
 */
interface ParsedSVGContent {
    attribs: Record<string, string>;
    body: string;
}
/**
 * Extract attributes and content from SVG
 */
declare function parseSVGContent(content: string): ParsedSVGContent | undefined;
/**
 * Convert parsed SVG to IconifyIconBuildResult
 */
declare function buildParsedSVG(data: ParsedSVGContent): IconifyIconBuildResult | undefined;
/**
 * Convert parsed SVG to IconifyIcon
 */
declare function convertParsedSVG(data: ParsedSVGContent): IconifyIcon | undefined;

export { type ParsedSVGContent, buildParsedSVG, convertParsedSVG, parseSVGContent };
