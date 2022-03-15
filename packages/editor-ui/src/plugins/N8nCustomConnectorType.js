/**
 * Custom connector type
 * Based on jsplumb Flowchart and Bezier types
 *
 * Source GitHub repository:
 * https://github.com/jsplumb/jsplumb
 *
 * Source files:
 * https://github.com/jsplumb/jsplumb/blob/fb5fce52794fa52306825bdaa62bf3855cdfd7e0/src/connectors-flowchart.js
 * https://github.com/jsplumb/jsplumb/blob/fb5fce52794fa52306825bdaa62bf3855cdfd7e0/src/connectors-bezier.js
 *
 *
 * All 1.x.x and 2.x.x versions of jsPlumb Community edition, and so also the
 * content of this file, are dual-licensed under both MIT and GPLv2.
 *
 * 				MIT LICENSE
 *
 * Copyright (c) 2010 - 2014 jsPlumb, http://jsplumbtoolkit.com/
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * ===============================================================================
 *         GNU GENERAL PUBLIC LICENSE
 *            Version 2, June 1991
 *
 *  Copyright (C) 1989, 1991 Free Software Foundation, Inc.
 *  51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
 *  Everyone is permitted to copy and distribute verbatim copies
 *  of this license document, but changing it is not allowed.
 *
 *           Preamble
 *
 *   The licenses for most software are designed to take away your
 * freedom to share and change it.  By contrast, the GNU General Public
 * License is intended to guarantee your freedom to share and change free
 * software--to make sure the software is free for all its users.  This
 * General Public License applies to most of the Free Software
 * Foundation's software and to any other program whose authors commit to
 * using it.  (Some other Free Software Foundation software is covered by
 * the GNU Lesser General Public License instead.)  You can apply it to
 * your programs, too.
 *
 *   When we speak of free software, we are referring to freedom, not
 * price.  Our General Public Licenses are designed to make sure that you
 * have the freedom to distribute copies of free software (and charge for
 * this service if you wish), that you receive source code or can get it
 * if you want it, that you can change the software or use pieces of it
 * in new free programs; and that you know you can do these things.
 *
 *   To protect your rights, we need to make restrictions that forbid
 * anyone to deny you these rights or to ask you to surrender the rights.
 * These restrictions translate to certain responsibilities for you if you
 * distribute copies of the software, or if you modify it.
 *
 *   For example, if you distribute copies of such a program, whether
 * gratis or for a fee, you must give the recipients all the rights that
 * you have.  You must make sure that they, too, receive or can get the
 * source code.  And you must show them these terms so they know their
 * rights.
 *
 *   We protect your rights with two steps: (1) copyright the software, and
 * (2) offer you this license which gives you legal permission to copy,
 * distribute and/or modify the software.
 *
 *   Also, for each author's protection and ours, we want to make certain
 * that everyone understands that there is no warranty for this free
 * software.  If the software is modified by someone else and passed on, we
 * want its recipients to know that what they have is not the original, so
 * that any problems introduced by others will not reflect on the original
 * authors' reputations.
 *
 *   Finally, any free program is threatened constantly by software
 * patents.  We wish to avoid the danger that redistributors of a free
 * program will individually obtain patent licenses, in effect making the
 * program proprietary.  To prevent this, we have made it clear that any
 * patent must be licensed for everyone's free use or not licensed at all.
 *
 *   The precise terms and conditions for copying, distribution and
 * modification follow.
 *
 *         GNU GENERAL PUBLIC LICENSE
 *    TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION
 *
 *   0. This License applies to any program or other work which contains
 * a notice placed by the copyright holder saying it may be distributed
 * under the terms of this General Public License.  The "Program", below,
 * refers to any such program or work, and a "work based on the Program"
 * means either the Program or any derivative work under copyright law:
 * that is to say, a work containing the Program or a portion of it,
 * either verbatim or with modifications and/or translated into another
 * language.  (Hereinafter, translation is included without limitation in
 * the term "modification".)  Each licensee is addressed as "you".
 *
 * Activities other than copying, distribution and modification are not
 * covered by this License; they are outside its scope.  The act of
 * running the Program is not restricted, and the output from the Program
 * is covered only if its contents constitute a work based on the
 * Program (independent of having been made by running the Program).
 * Whether that is true depends on what the Program does.
 *
 *   1. You may copy and distribute verbatim copies of the Program's
 * source code as you receive it, in any medium, provided that you
 * conspicuously and appropriately publish on each copy an appropriate
 * copyright notice and disclaimer of warranty; keep intact all the
 * notices that refer to this License and to the absence of any warranty;
 * and give any other recipients of the Program a copy of this License
 * along with the Program.
 *
 * You may charge a fee for the physical act of transferring a copy, and
 * you may at your option offer warranty protection in exchange for a fee.
 *
 *   2. You may modify your copy or copies of the Program or any portion
 * of it, thus forming a work based on the Program, and copy and
 * distribute such modifications or work under the terms of Section 1
 * above, provided that you also meet all of these conditions:
 *
 *     a) You must cause the modified files to carry prominent notices
 *     stating that you changed the files and the date of any change.
 *
 *     b) You must cause any work that you distribute or publish, that in
 *     whole or in part contains or is derived from the Program or any
 *     part thereof, to be licensed as a whole at no charge to all third
 *     parties under the terms of this License.
 *
 *     c) If the modified program normally reads commands interactively
 *     when run, you must cause it, when started running for such
 *     interactive use in the most ordinary way, to print or display an
 *     announcement including an appropriate copyright notice and a
 *     notice that there is no warranty (or else, saying that you provide
 *     a warranty) and that users may redistribute the program under
 *     these conditions, and telling the user how to view a copy of this
 *     License.  (Exception: if the Program itself is interactive but
 *     does not normally print such an announcement, your work based on
 *     the Program is not required to print an announcement.)
 *
 * These requirements apply to the modified work as a whole.  If
 * identifiable sections of that work are not derived from the Program,
 * and can be reasonably considered independent and separate works in
 * themselves, then this License, and its terms, do not apply to those
 * sections when you distribute them as separate works.  But when you
 * distribute the same sections as part of a whole which is a work based
 * on the Program, the distribution of the whole must be on the terms of
 * this License, whose permissions for other licensees extend to the
 * entire whole, and thus to each and every part regardless of who wrote it.
 *
 * Thus, it is not the intent of this section to claim rights or contest
 * your rights to work written entirely by you; rather, the intent is to
 * exercise the right to control the distribution of derivative or
 * collective works based on the Program.
 *
 * In addition, mere aggregation of another work not based on the Program
 * with the Program (or with a work based on the Program) on a volume of
 * a storage or distribution medium does not bring the other work under
 * the scope of this License.
 *
 *   3. You may copy and distribute the Program (or a work based on it,
 * under Section 2) in object code or executable form under the terms of
 * Sections 1 and 2 above provided that you also do one of the following:
 *
 *     a) Accompany it with the complete corresponding machine-readable
 *     source code, which must be distributed under the terms of Sections
 *     1 and 2 above on a medium customarily used for software interchange; or,
 *
 *     b) Accompany it with a written offer, valid for at least three
 *     years, to give any third party, for a charge no more than your
 *     cost of physically performing source distribution, a complete
 *     machine-readable copy of the corresponding source code, to be
 *     distributed under the terms of Sections 1 and 2 above on a medium
 *     customarily used for software interchange; or,
 *
 *     c) Accompany it with the information you received as to the offer
 *     to distribute corresponding source code.  (This alternative is
 *     allowed only for noncommercial distribution and only if you
 *     received the program in object code or executable form with such
 *     an offer, in accord with Subsection b above.)
 *
 * The source code for a work means the preferred form of the work for
 * making modifications to it.  For an executable work, complete source
 * code means all the source code for all modules it contains, plus any
 * associated interface definition files, plus the scripts used to
 * control compilation and installation of the executable.  However, as a
 * special exception, the source code distributed need not include
 * anything that is normally distributed (in either source or binary
 * form) with the major components (compiler, kernel, and so on) of the
 * operating system on which the executable runs, unless that component
 * itself accompanies the executable.
 *
 * If distribution of executable or object code is made by offering
 * access to copy from a designated place, then offering equivalent
 * access to copy the source code from the same place counts as
 * distribution of the source code, even though third parties are not
 * compelled to copy the source along with the object code.
 *
 *   4. You may not copy, modify, sublicense, or distribute the Program
 * except as expressly provided under this License.  Any attempt
 * otherwise to copy, modify, sublicense or distribute the Program is
 * void, and will automatically terminate your rights under this License.
 * However, parties who have received copies, or rights, from you under
 * this License will not have their licenses terminated so long as such
 * parties remain in full compliance.
 *
 *   5. You are not required to accept this License, since you have not
 * signed it.  However, nothing else grants you permission to modify or
 * distribute the Program or its derivative works.  These actions are
 * prohibited by law if you do not accept this License.  Therefore, by
 * modifying or distributing the Program (or any work based on the
 * Program), you indicate your acceptance of this License to do so, and
 * all its terms and conditions for copying, distributing or modifying
 * the Program or works based on it.
 *
 *   6. Each time you redistribute the Program (or any work based on the
 * Program), the recipient automatically receives a license from the
 * original licensor to copy, distribute or modify the Program subject to
 * these terms and conditions.  You may not impose any further
 * restrictions on the recipients' exercise of the rights granted herein.
 * You are not responsible for enforcing compliance by third parties to
 * this License.
 *
 *   7. If, as a consequence of a court judgment or allegation of patent
 * infringement or for any other reason (not limited to patent issues),
 * conditions are imposed on you (whether by court order, agreement or
 * otherwise) that contradict the conditions of this License, they do not
 * excuse you from the conditions of this License.  If you cannot
 * distribute so as to satisfy simultaneously your obligations under this
 * License and any other pertinent obligations, then as a consequence you
 * may not distribute the Program at all.  For example, if a patent
 * license would not permit royalty-free redistribution of the Program by
 * all those who receive copies directly or indirectly through you, then
 * the only way you could satisfy both it and this License would be to
 * refrain entirely from distribution of the Program.
 *
 * If any portion of this section is held invalid or unenforceable under
 * any particular circumstance, the balance of the section is intended to
 * apply and the section as a whole is intended to apply in other
 * circumstances.
 *
 * It is not the purpose of this section to induce you to infringe any
 * patents or other property right claims or to contest validity of any
 * such claims; this section has the sole purpose of protecting the
 * integrity of the free software distribution system, which is
 * implemented by public license practices.  Many people have made
 * generous contributions to the wide range of software distributed
 * through that system in reliance on consistent application of that
 * system; it is up to the author/donor to decide if he or she is willing
 * to distribute software through any other system and a licensee cannot
 * impose that choice.
 *
 * This section is intended to make thoroughly clear what is believed to
 * be a consequence of the rest of this License.
 *
 *   8. If the distribution and/or use of the Program is restricted in
 * certain countries either by patents or by copyrighted interfaces, the
 * original copyright holder who places the Program under this License
 * may add an explicit geographical distribution limitation excluding
 * those countries, so that distribution is permitted only in or among
 * countries not thus excluded.  In such case, this License incorporates
 * the limitation as if written in the body of this License.
 *
 *   9. The Free Software Foundation may publish revised and/or new versions
 * of the General Public License from time to time.  Such new versions will
 * be similar in spirit to the present version, but may differ in detail to
 * address new problems or concerns.
 *
 * Each version is given a distinguishing version number.  If the Program
 * specifies a version number of this License which applies to it and "any
 * later version", you have the option of following the terms and conditions
 * either of that version or of any later version published by the Free
 * Software Foundation.  If the Program does not specify a version number of
 * this License, you may choose any version ever published by the Free Software
 * Foundation.
 *
 *   10. If you wish to incorporate parts of the Program into other free
 * programs whose distribution conditions are different, write to the author
 * to ask for permission.  For software which is copyrighted by the Free
 * Software Foundation, write to the Free Software Foundation; we sometimes
 * make exceptions for this.  Our decision will be guided by the two goals
 * of preserving the free status of all derivatives of our free software and
 * of promoting the sharing and reuse of software generally.
 *
 *           NO WARRANTY
 *
 *   11. BECAUSE THE PROGRAM IS LICENSED FREE OF CHARGE, THERE IS NO WARRANTY
 * FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW.  EXCEPT WHEN
 * OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES
 * PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED
 * OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.  THE ENTIRE RISK AS
 * TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU.  SHOULD THE
 * PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING,
 * REPAIR OR CORRECTION.
 *
 *   12. IN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING
 * WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MAY MODIFY AND/OR
 * REDISTRIBUTE THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES,
 * INCLUDING ANY GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING
 * OUT OF THE USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED
 * TO LOSS OF DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY
 * YOU OR THIRD PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER
 * PROGRAMS), EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGES.
 *
 */
(function () {

	"use strict";
	var root = this, _jp = root.jsPlumb, _ju = root.jsPlumbUtil,  _jg = root.Biltong;
	var STRAIGHT = "Straight";
	var ARC = "Arc";

	/**
	 * Custom connector type
	 *
	 * @param stub {number} length of stub segments in flowchart
	 * @param getEndpointOffset {Function} callback to offset stub length based on endpoint in flowchart
	 * @param midpoint {number} float percent of halfway point of segments in flowchart
	 * @param loopbackVerticalLength {number} height of vertical segment when looping in flowchart
	 * @param cornerRadius {number} radius of flowchart connectors
	 * @param loopbackMinimum {number} minimum threshold before looping behavior takes effect in flowchart
	 * @param targetGap {number} gap between connector and target endpoint in both flowchart and bezier
	 */
	const N8nCustom = function (params) {
		params = params || {};
		this.type = "N8nCustom";

		params.stub = params.stub == null ? 30 : params.stub;

		var _super = _jp.Connectors.AbstractConnector.apply(this, arguments),
			minorAnchor = 0, // seems to be angle at which connector leaves endpoint
			majorAnchor = 0, // translates to curviness of bezier curve
			segments,
			midpoint = params.midpoint == null ? 0.5 : params.midpoint,
			alwaysRespectStubs = params.alwaysRespectStubs === true,
			loopbackVerticalLength = params.loopbackVerticalLength || 0,
			lastx = null, lasty = null,
			cornerRadius = params.cornerRadius != null ? params.cornerRadius : 0,
			loopbackMinimum = params.loopbackMinimum || 100,
			curvinessCoeffient = 0.4,
			zBezierOffset = 40,
			targetGap = params.targetGap || 0,
			stub = params.stub || 0;

		/**
		 * Set target endpoint
		 * (to override default behavior tracking mouse when dragging mouse)
		 * @param {Endpoint} endpoint
		 */
		this.setTargetEndpoint = function (endpoint) {
			this.overrideTargetEndpoint = endpoint;
		};

		/**
		 * reset target endpoint overriding default behavior
		 */
		this.resetTargetEndpoint = function () {
			this.overrideTargetEndpoint = null;
		};

		this._compute = function (originalPaintInfo, connParams) {
			const paintInfo = _getPaintInfo(connParams, { targetGap, stub, overrideTargetEndpoint: this.overrideTargetEndpoint, getEndpointOffset: params.getEndpointOffset });
			Object.keys(paintInfo).forEach((key) => {
				// override so that bounding box is calculated correctly wheen target override is set
				originalPaintInfo[key] = paintInfo[key];
			});

			if (paintInfo.tx < 0) {
				this._computeFlowchart(paintInfo);
			}
			else {
				this._computeBezier(paintInfo);
			}
		};

		this._computeBezier = function (paintInfo) {
			var sp = paintInfo.sourcePos,
				tp = paintInfo.targetPos,
				_w = Math.abs(sp[0] - tp[0]) - paintInfo.targetGap,
				_h = Math.abs(sp[1] - tp[1]);

			var _CP, _CP2,
				_sx = sp[0] < tp[0] ? _w : 0,
				_sy = sp[1] < tp[1] ? _h : 0,
				_tx = sp[0] < tp[0] ? 0 : _w,
				_ty = sp[1] < tp[1] ? 0 : _h;

			if (paintInfo.ySpan <= 20 || (paintInfo.ySpan <= 100 && paintInfo.xSpan <= 100)) {
				majorAnchor = 0.1;
			}
			else {
				majorAnchor = paintInfo.xSpan * curvinessCoeffient + zBezierOffset;
			}

			_CP = _findControlPoint([_sx, _sy], sp, tp, paintInfo.sourceEndpoint, paintInfo.targetEndpoint, paintInfo.so, paintInfo.to, majorAnchor, minorAnchor);
			_CP2 = _findControlPoint([_tx, _ty], tp, sp, paintInfo.targetEndpoint, paintInfo.sourceEndpoint, paintInfo.to, paintInfo.so, majorAnchor, minorAnchor);

			_super.addSegment(this, "Bezier", {
				x1: _sx, y1: _sy, x2: _tx, y2: _ty,
				cp1x: _CP[0], cp1y: _CP[1], cp2x: _CP2[0], cp2y: _CP2[1],
			});
		};

		/**
		 * helper method to add a segment.
		 */
		const addFlowchartSegment = function (segments, x, y, paintInfo) {
			if (lastx === x && lasty === y) {
				return;
			}
			var lx = lastx == null ? paintInfo.sx : lastx,
				ly = lasty == null ? paintInfo.sy : lasty,
				o = lx === x ? "v" : "h";

			lastx = x;
			lasty = y;
			segments.push([ lx, ly, x, y, o ]);
		};

		this._computeFlowchart = function (paintInfo) {

			segments = [];
			lastx = null;
			lasty = null;

			// calculate Stubs.
			var stubs = calcualteStubSegment(paintInfo, {alwaysRespectStubs});

			// add the start stub segment. use stubs for loopback as it will look better, with the loop spaced
			// away from the element.
			addFlowchartSegment(segments, stubs[0], stubs[1], paintInfo);

			// compute the rest of the line
			var p = calculateLineSegment(paintInfo, stubs, {midpoint, loopbackMinimum, loopbackVerticalLength});
			if (p) {
				for (var i = 0; i < p.length; i++) {
					addFlowchartSegment(segments, p[i][0], p[i][1], paintInfo);
				}
			}

			// line to end stub
			addFlowchartSegment(segments, stubs[2], stubs[3], paintInfo);

			// end stub to end (common)
			addFlowchartSegment(segments, paintInfo.tx, paintInfo.ty, paintInfo);

			// write out the segments.
			writeFlowchartSegments(_super, this, segments, paintInfo, cornerRadius);
		};
	};

	_jp.Connectors.N8nCustom = N8nCustom;
	_ju.extend(_jp.Connectors.N8nCustom, _jp.Connectors.AbstractConnector);


	function _findControlPoint(point, sourceAnchorPosition, targetAnchorPosition, sourceEndpoint, targetEndpoint, soo, too, majorAnchor, minorAnchor) {
		// determine if the two anchors are perpendicular to each other in their orientation.  we swap the control
		// points around if so (code could be tightened up)
		var perpendicular = soo[0] !== too[0] || soo[1] === too[1],
			p = [];

		if (!perpendicular) {
			if (soo[0] === 0) {
				p.push(sourceAnchorPosition[0] < targetAnchorPosition[0] ? point[0] + minorAnchor : point[0] - minorAnchor);
			}
			else {
				p.push(point[0] - (majorAnchor * soo[0]));
			}

			if (soo[1] === 0) {
				p.push(sourceAnchorPosition[1] < targetAnchorPosition[1] ? point[1] + minorAnchor : point[1] - minorAnchor);
			}
			else {
				p.push(point[1] + (majorAnchor * too[1]));
			}
		}
		else {
			if (too[0] === 0) {
				p.push(targetAnchorPosition[0] < sourceAnchorPosition[0] ? point[0] + minorAnchor : point[0] - minorAnchor);
			}
			else {
				p.push(point[0] + (majorAnchor * too[0]));
			}

			if (too[1] === 0) {
				p.push(targetAnchorPosition[1] < sourceAnchorPosition[1] ? point[1] + minorAnchor : point[1] - minorAnchor);
			}
			else {
				p.push(point[1] + (majorAnchor * soo[1]));
			}
		}

		return p;
	};


	function sgn(n) {
		return n < 0 ? -1 : n === 0 ? 0 : 1;
	};

	function getFlowchartSegmentDirections(segment) {
		return [
			sgn( segment[2] - segment[0] ),
			sgn( segment[3] - segment[1] ),
		];
	};

	function getSegmentLength(s) {
		return Math.sqrt(Math.pow(s[0] - s[2], 2) + Math.pow(s[1] - s[3], 2));
	};

	function _cloneArray(a) {
		var _a = [];
		_a.push.apply(_a, a);
		return _a;
	};

	function writeFlowchartSegments(_super, conn, segments, paintInfo, cornerRadius) {
		var current = null, next, currentDirection, nextDirection;
		for (var i = 0; i < segments.length - 1; i++) {

			current = current || _cloneArray(segments[i]);
			next = _cloneArray(segments[i + 1]);

			currentDirection = getFlowchartSegmentDirections(current);
			nextDirection = getFlowchartSegmentDirections(next);

			if (cornerRadius > 0 && current[4] !== next[4]) {

				var minSegLength = Math.min(getSegmentLength(current), getSegmentLength(next));
				var radiusToUse = Math.min(cornerRadius, minSegLength / 2);

				current[2] -= currentDirection[0] * radiusToUse;
				current[3] -= currentDirection[1] * radiusToUse;
				next[0] += nextDirection[0] * radiusToUse;
				next[1] += nextDirection[1] * radiusToUse;

				var ac = (currentDirection[1] === nextDirection[0] && nextDirection[0] === 1) ||
													((currentDirection[1] === nextDirection[0] && nextDirection[0] === 0) && currentDirection[0] !== nextDirection[1]) ||
													(currentDirection[1] === nextDirection[0] && nextDirection[0] === -1),
					sgny = next[1] > current[3] ? 1 : -1,
					sgnx = next[0] > current[2] ? 1 : -1,
					sgnEqual = sgny === sgnx,
					cx = (sgnEqual && ac || (!sgnEqual && !ac)) ? next[0] : current[2],
					cy = (sgnEqual && ac || (!sgnEqual && !ac)) ? current[3] : next[1];

				_super.addSegment(conn, STRAIGHT, {
					x1: current[0], y1: current[1], x2: current[2], y2: current[3],
				});

				_super.addSegment(conn, ARC, {
					r: radiusToUse,
					x1: current[2],
					y1: current[3],
					x2: next[0],
					y2: next[1],
					cx: cx,
					cy: cy,
					ac: ac,
				});
			}
			else {
				// dx + dy are used to adjust for line width.
				var dx = (current[2] === current[0]) ? 0 : (current[2] > current[0]) ? (paintInfo.lw / 2) : -(paintInfo.lw / 2),
					dy = (current[3] === current[1]) ? 0 : (current[3] > current[1]) ? (paintInfo.lw / 2) : -(paintInfo.lw / 2);

				_super.addSegment(conn, STRAIGHT, {
					x1: current[0] - dx, y1: current[1] - dy, x2: current[2] + dx, y2: current[3] + dy,
				});
			}
			current = next;
		}
		if (next != null) {
			// last segment
			_super.addSegment(conn, STRAIGHT, {
				x1: next[0], y1: next[1], x2: next[2], y2: next[3],
			});
		}
	};

	const lineCalculators = {
		opposite: function (paintInfo, {axis, startStub, endStub, idx, midx, midy}) {
			var pi = paintInfo,
				comparator = pi["is" + axis.toUpperCase() + "GreaterThanStubTimes2"];

			if (!comparator || (pi.so[idx] === 1 && startStub > endStub) || (pi.so[idx] === -1 && startStub < endStub)) {
				return {
					"x": [
						[startStub, midy],
						[endStub, midy],
					],
					"y": [
						[midx, startStub],
						[midx, endStub],
					],
				}[axis];
			}
			else if ((pi.so[idx] === 1 && startStub < endStub) || (pi.so[idx] === -1 && startStub > endStub)) {
				return {
					"x": [
						[midx, pi.sy],
						[midx, pi.ty],
					],
					"y": [
						[pi.sx, midy],
						[pi.tx, midy],
					],
				}[axis];
			}
		},
	};

	const stubCalculators = {
		opposite: function (paintInfo, {axis, alwaysRespectStubs}) {
			var pi = paintInfo,
				idx = axis === "x" ? 0 : 1,
				areInProximity = {
					"x": function () {
						return ( (pi.so[idx] === 1 && (
							( (pi.startStubX > pi.endStubX) && (pi.tx > pi.startStubX) ) ||
																( (pi.sx > pi.endStubX) && (pi.tx > pi.sx))))) ||

																( (pi.so[idx] === -1 && (
																	( (pi.startStubX < pi.endStubX) && (pi.tx < pi.startStubX) ) ||
																( (pi.sx < pi.endStubX) && (pi.tx < pi.sx)))));
					},
					"y": function () {
						return ( (pi.so[idx] === 1 && (
							( (pi.startStubY > pi.endStubY) && (pi.ty > pi.startStubY) ) ||
																( (pi.sy > pi.endStubY) && (pi.ty > pi.sy))))) ||

																( (pi.so[idx] === -1 && (
																	( (pi.startStubY < pi.endStubY) && (pi.ty < pi.startStubY) ) ||
																( (pi.sy < pi.endStubY) && (pi.ty < pi.sy)))));
					},
				};

			if (!alwaysRespectStubs && areInProximity[axis]()) {
				return {
					"x": [(paintInfo.sx + paintInfo.tx) / 2, paintInfo.startStubY, (paintInfo.sx + paintInfo.tx) / 2, paintInfo.endStubY],
					"y": [paintInfo.startStubX, (paintInfo.sy + paintInfo.ty) / 2, paintInfo.endStubX, (paintInfo.sy + paintInfo.ty) / 2],
				}[axis];
			}
			else {
				return [paintInfo.startStubX, paintInfo.startStubY, paintInfo.endStubX, paintInfo.endStubY];
			}
		},
	};

	function calcualteStubSegment(paintInfo, {alwaysRespectStubs}) {
		return stubCalculators['opposite'](paintInfo, {axis: paintInfo.sourceAxis, alwaysRespectStubs});
	}

	function calculateLineSegment(paintInfo, stubs, { midpoint, loopbackVerticalLength, loopbackMinimum }) {
		const axis = paintInfo.sourceAxis,
			idx = paintInfo.sourceAxis === "x" ? 0 : 1,
			oidx = paintInfo.sourceAxis === "x" ? 1 : 0,
			startStub = stubs[idx],
			otherStartStub = stubs[oidx],
			endStub = stubs[idx + 2],
			otherEndStub = stubs[oidx + 2];

		const diffX = paintInfo.endStubX - paintInfo.startStubX;
		const diffY = paintInfo.endStubY - paintInfo.startStubY;
		const direction = -1; // vertical direction of loop, always below source

		var midx = paintInfo.startStubX + ((paintInfo.endStubX - paintInfo.startStubX) * midpoint),
			midy;

		if (diffY >= 0 || diffX < (-1 * loopbackMinimum)) {
			// loop backward behavior
			midy = paintInfo.startStubY - (diffX < 0 ? direction * loopbackVerticalLength : 0);
		} else {
			// original flowchart behavior
			midy = paintInfo.startStubY + ((paintInfo.endStubY - paintInfo.startStubY) * midpoint);
		}

		return lineCalculators['opposite'](paintInfo, {axis, startStub, otherStartStub, endStub, otherEndStub, idx, oidx, midx, midy});
	}

	function _getPaintInfo(params, { targetGap, stub, overrideTargetEndpoint, getEndpointOffset }) {
		let { targetPos, targetEndpoint } = params;

		if (
			overrideTargetEndpoint
		) {
			targetPos = overrideTargetEndpoint.anchor.getCurrentLocation();
			targetEndpoint = overrideTargetEndpoint;
		}

		const sourceGap = 0;

		stub = stub || 0;
		const sourceStub = _ju.isArray(stub) ? stub[0] : stub;
		const targetStub = _ju.isArray(stub) ? stub[1] : stub;

		var segment = _jg.quadrant(params.sourcePos, targetPos),
			swapX = targetPos[0] < params.sourcePos[0],
			swapY = targetPos[1] < params.sourcePos[1],
			lw = params.strokeWidth || 1,
			so = params.sourceEndpoint.anchor.getOrientation(params.sourceEndpoint), // source orientation
			to = targetEndpoint.anchor.getOrientation(targetEndpoint), // target orientation
			x = swapX ? targetPos[0] : params.sourcePos[0],
			y = swapY ? targetPos[1] : params.sourcePos[1],
			w = Math.abs(targetPos[0] - params.sourcePos[0]),
			h = Math.abs(targetPos[1] - params.sourcePos[1]);

		// if either anchor does not have an orientation set, we derive one from their relative
		// positions.  we fix the axis to be the one in which the two elements are further apart, and
		// point each anchor at the other element.  this is also used when dragging a new connection.
		if (so[0] === 0 && so[1] === 0 || to[0] === 0 && to[1] === 0) {
			var index = w > h ? 0 : 1, oIndex = [1, 0][index];
			so = [];
			to = [];
			so[index] = params.sourcePos[index] > targetPos[index] ? -1 : 1;
			to[index] = params.sourcePos[index] > targetPos[index] ? 1 : -1;
			so[oIndex] = 0;
			to[oIndex] = 0;
		}

		const sx = swapX ? w + (sourceGap * so[0]) : sourceGap * so[0],
			sy = swapY ? h + (sourceGap * so[1]) : sourceGap * so[1],
			tx = swapX ? targetGap * to[0] : w + (targetGap * to[0]),
			ty = swapY ? targetGap * to[1] : h + (targetGap * to[1]),
			oProduct = ((so[0] * to[0]) + (so[1] * to[1]));

		const sourceStubWithOffset = sourceStub + (getEndpointOffset && params.sourceEndpoint ? getEndpointOffset(params.sourceEndpoint) : 0);
		const targetStubWithOffset = targetStub + (getEndpointOffset && targetEndpoint ? getEndpointOffset(targetEndpoint) : 0);

		// same as paintinfo generated by jsplumb AbstractConnector type
		var result = {
			sx: sx, sy: sy, tx: tx, ty: ty, lw: lw,
			xSpan: Math.abs(tx - sx),
			ySpan: Math.abs(ty - sy),
			mx: (sx + tx) / 2,
			my: (sy + ty) / 2,
			so: so, to: to, x: x, y: y, w: w, h: h,
			segment: segment,
			startStubX: sx + (so[0] * sourceStubWithOffset),
			startStubY: sy + (so[1] * sourceStubWithOffset),
			endStubX: tx + (to[0] * targetStubWithOffset),
			endStubY: ty + (to[1] * targetStubWithOffset),
			isXGreaterThanStubTimes2: Math.abs(sx - tx) > (sourceStubWithOffset + targetStubWithOffset),
			isYGreaterThanStubTimes2: Math.abs(sy - ty) > (sourceStubWithOffset + targetStubWithOffset),
			opposite: oProduct === -1,
			perpendicular: oProduct === 0,
			orthogonal: oProduct === 1,
			sourceAxis: so[0] === 0 ? "y" : "x",
			points: [x, y, w, h, sx, sy, tx, ty ],
			stubs:[sourceStubWithOffset, targetStubWithOffset],
			anchorOrientation: "opposite", // always opposite since our endpoints are always opposite (source orientation is left (1) and target orientaiton is right (-1))

			/** custom keys added */
			sourceEndpoint: params.sourceEndpoint,
			targetEndpoint: targetEndpoint,
			sourcePos: params.sourcePos,
			targetPos: targetEndpoint.anchor.getCurrentLocation(),
			targetGap,
		};

		return result;
	};


}).call(typeof window !== 'undefined' ? window : this);
