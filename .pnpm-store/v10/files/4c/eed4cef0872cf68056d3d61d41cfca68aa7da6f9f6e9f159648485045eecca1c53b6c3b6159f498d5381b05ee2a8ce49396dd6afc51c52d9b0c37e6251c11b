
/*
Copyright Â© 2001-2004 World Wide Web Consortium, 
(Massachusetts Institute of Technology, European Research Consortium 
for Informatics and Mathematics, Keio University). All 
Rights Reserved. This work is distributed under the W3CÂ® Software License [1] in the 
hope that it will be useful, but WITHOUT ANY WARRANTY; without even 
the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 

[1] http://www.w3.org/Consortium/Legal/2002/copyright-software-20021231
*/



   /**
    *  Gets URI that identifies the test.
    *  @return uri identifier of test
    */
function getTargetURI() {
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/html/HTMLDocument21";
   }

var docsLoaded = -1000000;
var builder = null;

//
//   This function is called by the testing framework before
//      running the test suite.
//
//   If there are no configuration exceptions, asynchronous
//        document loading is started.  Otherwise, the status
//        is set to complete and the exception is immediately
//        raised when entering the body of the test.
//
function setUpPage() {
   setUpPageStatus = 'running';
   try {
     //
     //   creates test document builder, may throw exception
     //
     builder = createConfiguredBuilder();

      docsLoaded = 0;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      docsLoaded += preload(docRef, "doc", "document");
        
       if (docsLoaded == 1) {
          setUpPageStatus = 'complete';
       }
    } catch(ex) {
    	catchInitializationError(builder, ex);
        setUpPageStatus = 'complete';
    }
}



//
//   This method is called on the completion of 
//      each asychronous load started in setUpTests.
//
//   When every synchronous loaded document has completed,
//      the page status is changed which allows the
//      body of the test to be executed.
function loadComplete() {
    if (++docsLoaded == 1) {
        setUpPageStatus = 'complete';
    }
}


/**
* 
Replaces the current document checks that writeln adds a new line.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-html#ID-72161170
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-html#ID-98948567
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-html#ID-75233634
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-html#ID-35318390
*/
function HTMLDocument21() {
   var success;
    if(checkInitialization(builder, "HTMLDocument21") != null) return;
    var doc;
      var docElem;
      var preElems;
      var preElem;
      var preText;
      var preValue;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "document");
      doc.open();
      
	if(
	
	(builder.contentType == "text/html")

	) {
	doc.writeln("<html>");
      
	}
	
		else {
			doc.writeln("<html xmlns='http://www.w3.org/1999/xhtml'>");
      
		}
	doc.writeln("<body>");
      doc.writeln("<title>Replacement</title>");
      doc.writeln("</body>");
      doc.write("<pre>");
      doc.writeln("Hello, World.");
      doc.writeln("Hello, World.");
      doc.writeln("</pre>");
      doc.write("<pre>");
      doc.write("Hello, World.");
      doc.write("Hello, World.");
      doc.writeln("</pre>");
      doc.writeln("</body>");
      doc.writeln("</html>");
      doc.close();
      
}




function runTest() {
   HTMLDocument21();
}
