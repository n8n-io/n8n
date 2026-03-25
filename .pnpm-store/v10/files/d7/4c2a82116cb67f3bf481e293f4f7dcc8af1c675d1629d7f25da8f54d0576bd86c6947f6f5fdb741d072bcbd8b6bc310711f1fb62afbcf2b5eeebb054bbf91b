/*                                                                             
Copyright (c) 2011, Chris Umbel                                                
                                                                                
Permission is hereby granted, free of charge, to any person obtaining a copy    
of this software and associated documentation files (the "Software"), to deal   
in the Software without restriction, including without limitation the rights    
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell       
copies of the Software, and to permit persons to whom the Software is           
furnished to do so, subject to the following conditions:                        
                                                                                
The above copyright notice and this permission notice shall be included in      
all copies or substantial portions of the Software.                             
                                                                                
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR      
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,        
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE     
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER          
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,   
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN       
THE SOFTWARE.                                                                   
*/
if(!expect){
	function expect(a){
		return {
			toBe: function(b){
				require('assert').strictEqual(a, b);
			}
		};
	}
}
var base32 = require('../lib/thirty-two/');

describe('thirty-two', function() {
    it('should encode', function() {
        expect(base32.encode('a').toString()).toBe('ME======');
        expect(base32.encode('be').toString()).toBe('MJSQ====');
        expect(base32.encode('bee').toString()).toBe('MJSWK===');
        expect(base32.encode('beer').toString()).toBe('MJSWK4Q=');
        expect(base32.encode('beers').toString()).toBe('MJSWK4TT');
        expect(base32.encode('beers 1').toString()).toBe('MJSWK4TTEAYQ====');
        expect(base32.encode('shockingly dismissed').toString()).toBe('ONUG6Y3LNFXGO3DZEBSGS43NNFZXGZLE');        
    });
    
    
    it('should decode', function() {
        expect(base32.decode('ME======').toString()).toBe('a');
        expect(base32.decode('MJSQ====').toString()).toBe('be');
        expect(base32.decode('ONXW4===').toString()).toBe('son');
        expect(base32.decode('MJSWK===').toString()).toBe('bee');
        expect(base32.decode('MJSWK4Q=').toString()).toBe('beer');
        expect(base32.decode('MJSWK4TT').toString()).toBe('beers');
        expect(base32.decode('mjswK4TT').toString()).toBe('beers');
        expect(base32.decode('MJSWK4TTN5XA====').toString()).toBe('beerson');
        expect(base32.decode('MJSWK4TTEAYQ====').toString()).toBe('beers 1');
        expect(base32.decode('ONUG6Y3LNFXGO3DZEBSGS43NNFZXGZLE').toString()).toBe('shockingly dismissed');
    });
    
    it('should be binary safe', function() {
        expect(base32.decode(base32.encode(new Buffer([0x00, 0xff, 0x88]))).toString('hex')).toBe('00ff88');
    	expect(base32.encode(new Buffer("f61e1f998d69151de8334dbe753ab17ae831c13849a6aecd95d0a4e5dc25", 'hex')).toString()).toBe('6YPB7GMNNEKR32BTJW7HKOVRPLUDDQJYJGTK5TMV2CSOLXBF');
    	expect(base32.decode('6YPB7GMNNEKR32BTJW7HKOVRPLUDDQJYJGTK5TMV2CSOLXBF').toString('hex')).toBe('f61e1f998d69151de8334dbe753ab17ae831c13849a6aecd95d0a4e5dc25');
    });
});
